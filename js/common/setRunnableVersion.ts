// Copyright 2017-2026, University of Colorado Boulder

/**
 * Sets the version of the current checked-in repo's package.json, creating a commit with the change
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import winston from 'winston';
import { gitIsClean } from './gitIsClean.js';
import { gitAdd } from './gitAdd.js';
import { gitCommit } from './gitCommit.js';
import loadJSON from './loadJSON.js';
import writeJSON from './writeJSON.js';
import fs from 'fs';
import SimVersion from '../browser-and-node/SimVersion.js';

/**
 * Sets the version for a current checked-in repo, creating a commit with the change
 * @public
 *
 * @param {string} repo - The repository name
 * @param {SimVersion} version
 * @param {string} [message] - Optional. If provided, appended at the end
 * @returns {Promise}
 */
export const setRunnableVersion = async( repo: string, version: SimVersion, message?: string ): Promise<void> => {
  winston.info( `Setting version from package.json for ${repo} to ${version.toString()}` );

  const packageFile = `../${repo}/package.json`;
  const packageLockFile = `../${repo}/package-lock.json`;

  const versionString = version.toString();

  const isClean = await gitIsClean();
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot increment version` );
  }

  const packageObject = await loadJSON( packageFile );
  packageObject.version = versionString;
  await writeJSON( packageFile, packageObject );

  if ( fs.existsSync( packageLockFile ) ) {
    const packageLockObject = await loadJSON( packageLockFile );
    packageLockObject.version = versionString;
    packageLockObject.packages[ '' ].version = versionString;
    fs.writeFileSync( packageLockFile, JSON.stringify( packageLockObject, null, 2 ) + os.EOL );
  }

  if ( !await gitIsClean( repo ) ) {
    await gitAdd('package.json' );
    if ( fs.existsSync( packageLockFile ) ) {
      await gitAdd( 'package-lock.json' );
    }
    await gitCommit( `Bumping ${repo} version to ${version.toString()}${message ? `, ${message}` : ''}` );
  }
};
