import type { Checkout } from './Checkout.js';
import winston from 'winston';
import execute, { ExecuteOptions } from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import withServer from './withServer.js';
import { puppeteerLoad } from './puppeteerLoad.js';
import { BuildOptions, getBuildArguments } from './getBuildArguments.js';
import _ from 'lodash';
import SimVersion from '../browser-and-node/SimVersion.js';
import { PackageJSON } from '../browser-and-node/PerennialTypes.js';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { getBranchSimVersion } from './getBranchSimVersion.js';

export class RunnableBranch {

  public constructor(
    public readonly checkout: Checkout,
    public readonly repo: string,
    public readonly brands: string[]
  ) {
    // TODO: do we want to specify workingDirectory as a helper?
  }

  /**
   * Returns the path (relative to the repo) to the built phet-brand HTML file
   */
  public async getLocalPhetBuiltHTMLPath(): Promise<string> {
    const usesChipper2 = await this.checkout.usesChipper2();

    return `build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html`;
  }

  /**
   * Returns the path (relative to the repo) to the built phet-io-brand HTML file
   *
   */
  public async getLocalPhetIOBuiltHTMLPath(): Promise<string> {
    const usesChipper2 = await this.checkout.usesChipper2();

    return `build/${usesChipper2 ? 'phet-io/' : ''}${this.repo}${usesChipper2 ? '_all_phet-io' : '_en-phetio'}.html`;
  }

  /**
   * Returns whether the sim supports interactive description.
   */
  public async supportsInteractiveDescription(): Promise<boolean> {
    const packageJSON = await this.getPackageJSON();
    const phet = packageJSON?.phet ?? {};
    const simFeatures = phet.simFeatures ?? {};

    // The name and location of the a11y flag in package.json has changed
    // over time,
    const accessibilityInFeatures = simFeatures.supportsInteractiveDescription || simFeatures.supportsDescription;
    const accessibilityInPhet = phet.supportsInteractiveDescriptions || phet.accessible || phet.supportsInteractiveDescription;

    return !!( accessibilityInFeatures || accessibilityInPhet );
  }

  public async transpile(): Promise<void> {
    const worktreeDirectory = this.checkout.workingDirectory;
    const repoDirectory = `${worktreeDirectory}/${this.repo}`;

    const supportsOutputJSGruntTask = ( await this.checkout.getChipperVersion() ).chipperSupportsOutputJSGruntTasks;

    if ( supportsOutputJSGruntTask ) {
      winston.info( `transpiling ${worktreeDirectory}` );

      // We might not be able to run this command!
      await execute( gruntCommand, [ 'output-js-project', '--silent' ], repoDirectory, {
        errors: 'resolve'
      } );
    }
  }

  public async build( options?: Partial<BuildOptions>, executeOptions?: ExecuteOptions & { errors?: 'reject' } ): Promise<string> {
    if ( !this.checkout.isCheckedOut ) {
      throw new Error( `Cannot build ${this.repo} because it is not checked out` );
    }

    const args = getBuildArguments( await this.checkout.getChipperVersion(), _.merge( {
      brands: this.brands,
      allHTML: true,
      debugHTML: true,
      // lint: false, TODO: when replacing usages, remember to turn off linting when not needed
      locales: '*'
    }, options ) );

    // Deletes the build/ directory for a repo to avoid legacy grunt clean issues that
    // attempt to delete outside the current working directory.
    // See https://github.com/phetsims/perennial/issues/480
    {
      const buildDirectory = `${this.checkout.workingDirectory}/${this.repo}/build`;
      await fsPromises.rm( buildDirectory, { recursive: true, force: true } );
    }

    // Cleans chipper/dist, see https://github.com/phetsims/perennial/issues/461#issuecomment-3837518242
    // Our TypeScript setup is now unreliable, and we need to clear out temporary files to prevent it from bugging out
    // (having stale TS data from OTHER release branches being used in DIFFERENT release branches --- can trigger or hide
    // errors).
    {
      const chipperDistDirectory = `${this.checkout.workingDirectory}/chipper/dist`;
      await fsPromises.rm( chipperDistDirectory, { recursive: true, force: true } );
    }

    winston.info( `building ${this.checkout.workingDirectory} with grunt ${args.join( ' ' )}` );
    const result = await execute( gruntCommand, args, `${this.checkout.workingDirectory}/${this.repo}`, executeOptions );

    // TODO: note we should --repo=${repo} potentially with newer chipper versions (!)
    // TODO: MR patch to older sims to support this, THEN get rid of "npm ci"-ing the sim repo itself(!)
    // TODO: (or... detected chipper version and run in different places, potentially do that first)

    // Examine output to see if getDependencies (in chipper) notices any missing phet-io things.
    // Fail out if so. Detects that specific error message.
    if ( this.brands.includes( 'phet-io' ) && result.includes( 'WARNING404' ) ) {
      throw new Error( 'phet-io dependencies missing' );
    }

    return result;
  }

  /**
   * Updates the HTML with new versions, and commits/pushes
   */
  public async updateHTMLVersion(): Promise<void> {
    winston.info( `Updating HTML for ${this.repo} with the new version strings` );

    const isClean = await this.checkout.isClean();
    if ( !isClean ) {
      throw new Error( `Unclean status in ${this.repo}, cannot clean up HTML` );
    }

    const packageJSON = await this.getPackageJSON();

    // We'll want to update development/test HTML as necessary, since they'll include the version
    await execute( gruntCommand, [ 'generate-development-html', `--repo=${this.repo}` ], `${this.checkout.workingDirectory}/chipper` );
    await this.checkout.gitAdd( `${this.repo}/${this.repo}_en.html` );

    if ( packageJSON.phet?.generatedUnitTests ) {
      await execute( gruntCommand, [ 'generate-test-html', `--repo=${this.repo}` ], '../chipper' );
      await this.checkout.gitAdd( `${this.repo}/${this.repo}-tests.html` );
    }
    if ( !( await this.checkout.isClean() ) ) {
      await this.checkout.gitCommit( `Bumping ${this.repo} dev${packageJSON.phet?.generatedUnitTests ? '/test' : ''} HTML with new version` );
      await this.checkout.gitPush();
    }
  }

  /**
   * Sets the supported brands, and commits/pushes
   */
  public async setSupportedBrands( brands: string[], message?: string ): Promise<void> {
    winston.info( `Setting supported brands from package.json for ${this.repo} at ${this.checkout.branch} to ${brands}` );

    const isClean = await this.checkout.isClean();
    if ( !isClean ) {
      throw new Error( 'Unclean status, cannot increment version' );
    }

    const packageJSON = await this.getPackageJSON();
    packageJSON.phet = packageJSON.phet || {};
    packageJSON.phet.supportedBrands = brands;

    await this.setPackageJSON( packageJSON, `Updating supported brands to [${brands}]${message ? `, ${message}` : ''}` );
  }

  /**
   * Sets the sim version, and commits/pushes
   */
  public async setSimVersion( version: SimVersion, message?: string ): Promise<void> {
    winston.info( `Setting version from package.json for ${this.repo} to ${version.toString()}` );

    const packageFile = `${this.repo}/package.json`;
    const packageLockFile = `${this.repo}/package-lock.json`;

    const versionString = version.toString();

    const isClean = await this.checkout.isClean();
    if ( !isClean ) {
      throw new Error( `Unclean status in ${this.repo}, cannot increment version` );
    }

    const packageJSON = await this.getPackageJSON();
    packageJSON.version = versionString;
    await this.checkout.writeAddRelativeJSON( packageFile, packageJSON );

    if ( fs.existsSync( `${this.checkout.workingDirectory}/${packageLockFile}` ) ) {
      const packageLockObject = await this.checkout.getRelativeJSON( packageLockFile );
      packageLockObject.version = versionString;
      packageLockObject.packages[ '' ].version = versionString;
      await this.checkout.writeAddRelativeJSON( packageLockFile, packageLockObject );
    }

    if ( !await this.checkout.isClean() ) {
      await this.checkout.gitCommit( `Bumping ${this.repo} version to ${version.toString()}${message ? `, ${message}` : ''}` );
      await this.checkout.gitPush();
    }
  }

  /**
   * Sets the package.json, and commits/pushes
   */
  public async setPackageJSON( packageJSON: PackageJSON, message: string ): Promise<void> {
    const isClean = await this.checkout.isClean();
    if ( !isClean ) {
      throw new Error( 'Unclean status, set package.json' );
    }

    await this.checkout.writeAddRelativeJSON( `${this.repo}/package.json`, packageJSON );

    // Only commit if there was actually something changed
    if ( !( await this.checkout.isClean() ) ) {
      await this.checkout.gitCommit( message );
      await this.checkout.gitPush();
    }
  }

  public async updateProductionREADME(): Promise<void> {
    winston.info( 'Updating branch README' );

    try {
      await execute( gruntCommand, [ 'published-readme', `--repo=${this.repo}` ], this.checkout.workingDirectory );
    }
    catch( e ) {
      winston.info( 'published-readme error, may not exist, will try generate-published-README' );
      try {
        await execute( gruntCommand, [ 'generate-published-README', `--repo=${this.repo}` ], this.checkout.workingDirectory );
      }
      catch( e ) {
        winston.info( 'No published README generation found' );
      }
    }

    await this.checkout.gitAdd( `${this.repo}/README.md` );

    if ( !await this.checkout.isClean() ) {
      await this.checkout.gitCommit( `Generated published README.md for ${this.checkout.branch} as part of a production deploy` );
      await this.checkout.gitPush();
    }
  }

  public async checkUnbuilt(): Promise<string | null> {
    try {
      return await withServer( async port => {
        const url = `http://localhost:${port}/${this.repo}/${this.repo}_en.html?brand=phet&ea&fuzzMouse&fuzzTouch`;
        try {
          await puppeteerLoad( url, {
            waitAfterLoad: 20000
          } );
          return null;
        }
        catch( e ) {
          return `Failure for ${url}: ${e}`;
        }
      }, {
        path: this.checkout.workingDirectory
      } );
    }
    catch( e ) {
      return `[ERROR] Failure to check: ${e}`;
    }
  }

  public async checkBuilt(): Promise<string | null> {
    try {
      const usesChipper2 = await this.checkout.usesChipper2();

      return await withServer( async port => {
        const url = `http://localhost:${port}/${this.repo}/build/${usesChipper2 ? 'phet/' : ''}${this.repo}_en${usesChipper2 ? '_phet' : ''}.html?fuzzMouse&fuzzTouch`;
        try {
          await puppeteerLoad( url, {
            waitAfterLoad: 20000
          } );
          return null;
        }
        catch( error ) {
          return `Failure for ${url}: ${error}`;
        }
      }, {
        path: this.checkout.workingDirectory
      } );
    }
    catch( e ) {
      return `[ERROR] Failure to check: ${e}`;
    }
  }

  /**
   * Returns the SimVersion for this release branch
   */
  public async getSimVersion(): Promise<SimVersion> {
    return getBranchSimVersion( this.repo, this.checkout.branch );
  }

  /**
   * Returns the package.json parsed as a plain JS object.
   */
  public async getPackageJSON(): Promise<PackageJSON> {
    return getBranchPackageJSON( this.repo, this.checkout.branch );
  }

  /**
   * Returns the package.json parsed as a plain JS object.
   */
  public async getMainPackageJSON(): Promise<PackageJSON> {
    return getBranchPackageJSON( this.repo, 'main' );
  }

  public async isPublished(): Promise<boolean> {
    // NOTE: we check on main here
    return ( await this.getMainPackageJSON() ).phet?.published ?? false;
  }

  // Fallback, ReleaseBranch can override
  public async getDependencies(): Promise<string[]> {
    return ( await this.checkout.getDependenciesMap( [ this.repo ] ) )[ this.repo ];
  }
}