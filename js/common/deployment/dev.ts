// Copyright 2017-2026, University of Colorado Boulder

/**
 * Deploys a dev version after incrementing the test version number.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../../browser-and-node/SimVersion.js';
import assert from 'assert';
import { vpnCheck } from '../vpnCheck.js';
import { getBranch } from '../git/getBranch.js';
import { Checkout } from '../Checkout.js';
import { lintProject } from '../lintProject.js';
import { buildLocal } from '../buildLocal.js';
import { devDirectoryExists } from '../devDirectoryExists.js';
import { booleanPrompt } from '../booleanPrompt.js';
import winston from 'winston';
import { writePhetioHtaccess } from '../writePhetioHtaccess.js';
import { devSsh } from '../devSsh.js';
import { devScp } from '../devScp.js';

class DevDeployError extends Error {
  public constructor( message: string ) {
    super( `Cancelling Dev deployment: ${message}` );
    this.name = 'DevDeployError';
  }
}

export type DevDeployOptions = {
  // If present and non-main, this will trigger a one-off deploy
  oneOffBranch?: string;

  // Whether to skip user prompts and assume "yes" for all questions. Useful for maintenance/CI/etc.
  noninteractive?: boolean;

  // Optional message to append to the version-increment commit.
  message?: string;
};

/**
 * Deploys a dev version after incrementing the test version number.
 */
export const dev = async (
  repo: string,
  options?: DevDeployOptions
): Promise<SimVersion> => {
  const noninteractive = options?.noninteractive ?? false;
  const message = options?.message;
  const branch = options?.oneOffBranch ?? 'main';

  const checkout = branch === 'main' ? await Checkout.getMainCheckout() : await Checkout.getOneOffCheckout( branch );
  const runnableBranch = await checkout.getRunnableBranch( repo );

  const isOneOff = branch !== 'main';
  const testType = isOneOff ? branch : 'dev';
  if ( isOneOff ) {
    assert( !branch.includes( '-' ), 'One-off versions should be from branches that do not include hyphens' );
  }

  if ( !( await vpnCheck() ) ) {
    throw new Error( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  const currentBranch = await getBranch();
  if ( currentBranch !== branch ) {
    throw new Error( `${testType} deployment should be on the branch ${branch}, not: ${currentBranch ? currentBranch : '(detached head)'}` );
  }

  const previousVersion = await runnableBranch.getSimVersion();

  if ( previousVersion.testType !== testType ) {
    if ( isOneOff ) {
      throw new Error( `The current version identifier is not a one-off version (should be something like ${previousVersion.major}.${previousVersion.minor}.${previousVersion.maintenance}-${testType}.${previousVersion.testNumber === null ? '0' : previousVersion.testNumber}), aborting.` );
    }
    else {
      throw new Error( 'The current version identifier is not a dev version, aborting.' );
    }
  }

  if ( !await checkout.isClean() ) {
    throw new DevDeployError( `Unclean status in ${checkout.branch}, cannot deploy` );
  }

  // Ensure we are up-to-date with the remote on this branch
  await checkout.gitPullRebase();

  // Ensure that the repository and its dependencies pass lint before continuing.
  // See https://github.com/phetsims/perennial/issues/76
  await lintProject( repo ); // NOTE: This does NOT use a checkout-relative path, but a relative path

  // Bump the version
  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance, {
    testType: testType,
    testNumber: previousVersion.testNumber! + 1
  } );

  const versionString = version.toString();
  const simPath = buildLocal.devDeployPath + repo;
  const versionPath = `${simPath}/${versionString}`;

  const simPathExists = await devDirectoryExists( simPath );
  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    throw new Error( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
    throw new Error( `Aborted ${testType} deploy` );
  }

  await checkout.npmUpdateRepo( 'chipper' );
  await checkout.npmUpdateRepo( 'perennial-alias' );

  await runnableBranch.setSimVersion( version, message );
  await runnableBranch.updateHTMLVersion();

  winston.info( await runnableBranch.build( {
    allHTML: true,
    debugHTML: true
  } ) );

  // If there is a protected directory and we are copying to the dev server, include the .htaccess file
  // This is for PhET-iO simulations, to protected the password protected wrappers, see
  // https://github.com/phetsims/phet-io/issues/641
  if ( runnableBranch.brands.includes( 'phet-io' ) && buildLocal.devDeployServer === 'bayes.colorado.edu' ) {
    const htaccessLocation = `../${repo}/build/phet-io`;
    await writePhetioHtaccess( repo, htaccessLocation, {
      checkoutDir: '../'
    } );
  }

  // Create (and fix permissions for) the main simulation directory, if it didn't already exist
  if ( !simPathExists ) {
    await devSsh( `mkdir -p "${simPath}" && echo "IndexOrderDefault Descending Date\n" > "${simPath}/.htaccess"` );
  }

  // Create the version-specific directory
  await devSsh( `mkdir -p "${versionPath}"` );

  // Copy the build contents into the version-specific directory
  for ( const brand of runnableBranch.brands ) {
    await devScp( `../${repo}/build/${brand}`, `${versionPath}/` );
  }

  const versionURL = `https://phet-dev.colorado.edu/html/${repo}/${versionString}`;

  if ( runnableBranch.brands.includes( 'phet' ) ) {
    winston.info( `Deployed: ${versionURL}/phet/${repo}_all_phet.html` );
  }
  if ( runnableBranch.brands.includes( 'phet-io' ) ) {
    winston.info( `Deployed: ${versionURL}/phet-io/` );
  }

  return version;
};