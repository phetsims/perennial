import type { Checkout } from './Checkout.js';
import winston from 'winston';
import execute, { ExecuteOptions } from './execute.js';
import { gruntCommand } from './gruntCommand.js';
import withServer from './withServer.js';
import { puppeteerLoad } from './puppeteerLoad.js';
import { BuildOptions, getBuildArguments } from './getBuildArguments.js';
import _ from 'lodash';
import SimVersion from '../browser-and-node/SimVersion.js';
import { getBranchVersion } from './getBranchVersion.js';
import { PackageJSON } from '../browser-and-node/PerennialTypes.js';
import { getBranchPackageJSON } from './getBranchPackageJSON.js';

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

  public async build( options?: Partial<BuildOptions>, executeOptions?: ExecuteOptions & { errors?: 'reject' } ): Promise<void> {
    const args = getBuildArguments( await this.checkout.getChipperVersion(), _.merge( {
      brands: this.brands,
      allHTML: true,
      debugHTML: true,
      lint: false,
      locales: '*'
    }, options ) );

    winston.info( `building ${this.checkout.workingDirectory} with grunt ${args.join( ' ' )}` );
    await execute( gruntCommand, args, `${this.checkout.workingDirectory}/${this.repo}`, executeOptions );
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
    return getBranchVersion( this.repo, this.checkout.branch );
  }

  /**
   * Returns the package.json parsed as a plain JS object.
   */
  public async getPackageJSON(): Promise<PackageJSON> {
    return getBranchPackageJSON( this.repo, this.checkout.branch );
  }
}