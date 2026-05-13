// Copyright 2017-2026, University of Colorado Boulder

/**
 * Deploys an rc version after incrementing the test version number.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import grunt from 'grunt';
import SimVersion from '../browser-and-node/SimVersion';
import { Repo } from '../browser-and-node/PerennialTypes.js';
import { vpnCheck } from '../common/vpnCheck';
import { gitIsClean } from '../common/gitIsClean';
import { hasRemoteBranch } from '../common/hasRemoteBranch.js';
import { booleanPrompt } from '../common/booleanPrompt';
import createRelease from './createRelease';
import { buildLocal } from '../common/buildLocal.js';
import { devDirectoryExists } from '../common/devDirectoryExists';
import { Checkout } from '../common/Checkout';
import buildServerRequest from '../common/buildServerRequest';

const cancelLog = ( problem: unknown ) => grunt.log.writeln( 'Cancelling RC deployment: ' + problem );
const handleError = ( problem: unknown ) => {
  cancelLog( problem );
  throw new Error( 'Aborted RC deployment: ' + problem );
};

export type RCOptions = {
  // Whether to skip user prompts and assume "yes" for all questions. Useful for maintenance/CI/etc.
  noninteractive?: boolean;

  // Optional message to append to the version-increment commit.
  message?: string;

  // Skips the build step (should only be used if confident in the build)
  skipBuild?: boolean;
};

/**
 * Deploys an rc version after incrementing the test version number.
 */
export const rc = async (
  repo: Repo,
  branch: string,
  options?: RCOptions
): Promise<SimVersion> => {
  const noninteractive = options?.noninteractive ?? false;
  const message = options?.message;
  const skipBuild = options?.skipBuild ?? false;

  // Assertions for the version.
  SimVersion.ensureReleaseBranch( branch );

  if ( !( await vpnCheck() ) ) {
    handleError( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  const isClean = await gitIsClean();
  if ( !isClean ) {
    handleError( `Unclean status, cannot create release branch` );
  }

  if ( !( await hasRemoteBranch( Checkout.getReleaseBranchName( repo, branch ) ) ) ) {
    if ( noninteractive || !await booleanPrompt( `Release branch ${branch} does not exist. Create it?`, false ) ) {
      handleError( 'Release branch does not exist' );
    }

    const includePhetIO = await booleanPrompt( 'Include phet-io brand in release branch?', noninteractive );
    const brands = includePhetIO ? [ 'phet', 'phet-io' ] : [ 'phet' ];

    await createRelease( repo, branch, brands );
  }

  const releaseBranch = await Checkout.getReleaseBranch( repo, branch );
  const checkout = releaseBranch.checkout;

  // PhET-iO simulations require validation for RCs. Error out if "phet.phet-io.validation=false" is in package.json.
  if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    const packageJSON = await releaseBranch.getPackageJSON();
    if ( packageJSON?.phet?.[ 'phet-io' ] && packageJSON.phet[ 'phet-io' ].hasOwnProperty( 'validation' ) &&
         !packageJSON.phet[ 'phet-io' ].validation ) {
      handleError( 'PhET-iO simulations require validation for RCs' );
    }
  }

  await checkout.update();

  const previousVersion = await releaseBranch.getSimVersion();

  if ( previousVersion.testType !== 'rc' && previousVersion.testType !== null ) {
    handleError( `RC version number cannot be incremented safely: ${previousVersion}` );
  }

  const version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance + ( previousVersion.testType === null ? 1 : 0 ), {
    testType: 'rc',
    testNumber: previousVersion.testNumber ? previousVersion.testNumber + 1 : 1
  } );

  const versionString = version.toString();
  const simPath = buildLocal.devDeployPath + repo;
  const versionPath = `${simPath}/${versionString}`;

  const versionPathExists = await devDirectoryExists( versionPath );

  if ( versionPathExists ) {
    handleError( `Directory ${versionPath} already exists.  If you intend to replace the content then remove the directory manually from ${buildLocal.devDeployServer}.` );
  }

  if ( !await booleanPrompt( `Deploy ${versionString} to ${buildLocal.devDeployServer}`, noninteractive ) ) {
    handleError( '"Deploy" user request' );
  }

  // Now this is just a sanity check to ensure that we don't have errors that we're sending to the build server
  if ( !skipBuild ) {
    // No special options required here, as we send the main request to the build server
    grunt.log.writeln( await releaseBranch.build( {
      minify: !noninteractive
    } ) );
  }

  await releaseBranch.setSimVersion( version, message );
  await checkout.gitPush();

  if ( !skipBuild && !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy`, noninteractive ) ) {
    await releaseBranch.setSimVersion( previousVersion, `Reverting deploy version for: ${message}` );
    await checkout.gitPush();

    handleError( `Built sim test failed, reverted back to ${previousVersion}` );
  }

  // Send the build request
  await buildServerRequest( repo, version, branch, await checkout.getSHA(), {
    locales: [ '*' ],
    servers: [ 'dev' ]
  } );

  const versionURL = `https://phet-dev.colorado.edu/html/${repo}/${versionString}`;

  if ( releaseBranch.brands.includes( 'phet' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phet/${repo}_all_phet.html` );
  }
  if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    grunt.log.writeln( `Deployed: ${versionURL}/phet-io/` );
  }

  grunt.log.writeln( 'Please wait for the build-server to complete the deployment, and then test!' );
  grunt.log.writeln( `To view the current build status, visit ${buildLocal.productionServerURL}/deploy-status` );

  return version;
};