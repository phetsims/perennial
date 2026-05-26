// Copyright 2017-2026, University of Colorado Boulder

/**
 * Deploys a production version after incrementing the test version number.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import SimVersion from '../../browser-and-node/SimVersion.js';
import { Checkout } from '../Checkout.js';
import { gitIsClean } from '../git/gitIsClean.js';
import { hasRemoteBranch } from '../git/hasRemoteBranch.js';
import { vpnCheck } from '../vpnCheck.js';
import { booleanPrompt } from '../booleanPrompt.js';
import simMetadata from '../simMetadata.js';
import assert from 'assert';
import winston from 'winston';
import { buildServerRequest } from '../buildServerRequest.js';
import { buildLocal } from '../buildLocal.js';

class ProductionDeployError extends Error {
  public constructor( message: string ) {
    super( `Cancelling Production deployment: ${message}` );
    this.name = 'ProductionDeployError';
  }
}

export type ProductionDeployOptions = {
  // Whether this is a redeploy (allows deploying with the same version)
  redeploy?: boolean;

  // Whether to skip user prompts and assume "yes" for all questions. Useful for maintenance/CI/etc.
  noninteractive?: boolean;

  // Optional message to append to the version-increment commit.
  message?: string;

  // Skips the build step (should only be used if confident in the build)
  skipBuild?: boolean;
};

/**
 * Deploys a production version after incrementing the test version number.
 */
export const production = async (
  repo: string,
  legacyBranch: string,
  options?: ProductionDeployOptions
): Promise<SimVersion> => {
  const noninteractive = options?.noninteractive ?? false;
  const message = options?.message;
  const skipBuild = options?.skipBuild ?? false;
  const redeploy = options?.redeploy ?? false;

  SimVersion.ensureReleaseBranch( legacyBranch );

  winston.info( 'checking vpn' );
  if ( !( await vpnCheck() ) ) {
    throw new ProductionDeployError( 'VPN or being on campus is required for this build. Ensure VPN is enabled, or that you have access to phet-server2.int.colorado.edu' );
  }

  winston.info( 'checking clean main checkout' );
  if ( !await gitIsClean() ) {
    throw new ProductionDeployError( 'Unclean status on main checkout, cannot create release branch' );
  }

  winston.info( 'checking for remote branch' );
  if ( !( await hasRemoteBranch( Checkout.getReleaseBranchName( repo, legacyBranch ) ) ) ) {
    throw new ProductionDeployError( `Cannot find release branch ${Checkout.getReleaseBranchName( repo, legacyBranch )} for ${repo}` );
  }

  winston.info( 'loading checkout' );
  const releaseBranch = await Checkout.getReleaseBranch( repo, legacyBranch );
  const checkout = releaseBranch.checkout;

  if ( !checkout.existsRelative( `${repo}/assets/${repo}-screenshot.png` ) && releaseBranch.brands.includes( 'phet' ) ) {
    throw new ProductionDeployError( `Missing screenshot file (${repo}/assets/${repo}-screenshot.png)` );
  }

  if ( !await booleanPrompt( 'Are QA credits up-to-date?', noninteractive ) ) {
    throw new ProductionDeployError( 'QA credits not up-to-date' );
  }

  if ( !await booleanPrompt( 'Have all maintenance patches that need spot checks been tested? (An issue would be created in the sim repo)', noninteractive ) ) {
    throw new ProductionDeployError( 'Maintenance patches are not tested' );
  }

  winston.info( 'querying sim metadata' );
  const isFirstVersion = !( await simMetadata( {
    simulation: repo
  } ) ).projects;

  // Initial deployment nags
  if ( isFirstVersion ) {
    if ( !await booleanPrompt( 'Is the main checklist complete (e.g. are screenshots added to assets, etc.)', noninteractive ) ) {
      throw new ProductionDeployError( 'Main checklist not complete' );
    }
  }

  redeploy && assert( noninteractive, 'redeploy can only be specified with noninteractive:true' );

  const published = await releaseBranch.isPublished();

  winston.info( 'updating worktree' );
  await checkout.updateWorktree();

  winston.info( 'checking clean release branch checkout' );
  if ( !await checkout.isClean() ) {
    throw new ProductionDeployError( `Unclean status in ${checkout.branch}, cannot deploy` );
  }

  const previousVersion = await releaseBranch.getSimVersion();
  let version;
  let versionChanged;

  if ( previousVersion.testType === null ) {

    // redeploy flag can bypass this prompt and error
    if ( !redeploy && ( noninteractive || !await booleanPrompt( `The last deployment was a production deployment (${previousVersion.toString()}) and an RC version is required between production versions. Would you like to redeploy ${previousVersion.toString()} (y) or cancel this process and revert to main (N)`, false ) ) ) {
      throw new ProductionDeployError( 'It appears that the last deployment was for production' );
    }

    version = previousVersion;
    versionChanged = false;
  }
  else if ( previousVersion.testType === 'rc' ) {
    version = new SimVersion( previousVersion.major, previousVersion.minor, previousVersion.maintenance );
    versionChanged = true;
  }
  else {
    throw new ProductionDeployError( `The version number cannot be incremented safely: ${previousVersion}` );
  }

  const versionString = version.toString();

  // caps-lock should hopefully shout this at people. do we have a text-to-speech synthesizer we can shout out of their speakers?
  // SECOND THOUGHT: this would be horrible during automated maintenance releases.
  if ( !await booleanPrompt( `DEPLOY ${repo} ${versionString} (brands: ${releaseBranch.brands.join( ',' )}) to PRODUCTION`, noninteractive ) ) {
    throw new ProductionDeployError( '"DEPLOY" user request' );
  }

  if ( versionChanged ) {
    winston.info( 'setting sim version on release branch' );
    await releaseBranch.setSimVersion( version, message );
  }

  // Update the README on the branch
  if ( published ) {
    winston.info( 'updating production README on release branch' );
    await releaseBranch.updateProductionREADME();
  }

  // Now this is just a sanity check to ensure that we don't have errors that we're sending to the build server
  if ( !skipBuild ) {
    winston.info( 'building... (may take a while)' );
    // No special options required here, as we send the main request to the build server
    winston.info( await releaseBranch.build( {
      minify: !noninteractive
    } ) );
  }

  if ( !skipBuild && !await booleanPrompt( `Please test the built version of ${repo}.\nIs it ready to deploy`, noninteractive ) ) {
    await releaseBranch.setSimVersion( previousVersion, `Reverting deploy version for: ${message}` );

    throw new ProductionDeployError( `Built sim test failed, reverted back to ${previousVersion}` );
  }

  // Send the build request
  winston.info( 'sending build-server request' );
  await buildServerRequest( repo, version, legacyBranch, releaseBranch.getBuildServerBrands(), await checkout.getSHA(), {
    locales: '*',
    servers: [ 'dev', 'production' ]
  } );

  if ( releaseBranch.brands.includes( 'phet' ) ) {
    winston.info( `Deployed: https://phet.colorado.edu/sims/html/${repo}/latest/${repo}_all.html` );
  }
  if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    winston.info( `Deployed: https://phet-io.colorado.edu/sims/${repo}/${versionString}/` );
  }

  winston.info( 'Please wait for the build-server to complete the deployment, and then test!' );
  winston.info( `To view the current build status, visit ${buildLocal.productionServerURL}/deploy-status` );

  if ( isFirstVersion && releaseBranch.brands.includes( 'phet' ) ) {
    winston.info( 'After testing, let the simulation lead know it has been deployed, so they can edit metadata on the website' );

    // Update the README on main
    if ( published ) {
      winston.info( 'Updating main README' );

      await ( await Checkout.getMainRunnableBranch( repo ) ).updateProductionREADME();
    }
  }

  // phet-io nags from the checklist
  if ( releaseBranch.brands.includes( 'phet-io' ) ) {
    const phetioLogText = 'PhET-iO deploys involve a couple of extra steps after production. Create an issue in the ' +
                          'phet-io repo using the "New or Republished PhET-iO Simulation Publication" issue template ' +
                          'to make sure these are accomplished. Assign yourself for "developer" steps.';
    winston.info( phetioLogText );
  }

  return version;
};