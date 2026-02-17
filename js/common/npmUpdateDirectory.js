// Copyright 2023, University of Colorado Boulder

/**
 * npm update
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

const execute = require( './execute' ).default;
const npmCommand = require( './npmCommand' );
const winston = require( 'winston' );
const asyncMutex = require( 'async-mutex' );
const fs = require( 'fs' );

const mutex = new asyncMutex.Mutex();


/**
 * @public
 * @param {{ minimal?: boolean }} [options]
 */
function getNpmInstallFlags( options ) {
  const minimal = options?.minimal ?? true;

  return minimal ? [ '--audit=false', '--fund=false' ] : [];
}

/**
 * Executes an effective "npm install", ensuring that the node_modules versions match package.json (and the lock file if present).
 * @public
 *
 * @param {string} directory
 * @param {{ clean?: boolean, minimal?: boolean }} [options]
 * @returns {Promise}
 */
module.exports = async function npmUpdateDirectory( directory, options ) {
  winston.info( `npm update in ${directory}` );

  const clean = options?.clean ?? false;

  const hasPackageLock = fs.existsSync( `${directory}/package-lock.json` );

  const flags = getNpmInstallFlags( options );

  // NOTE: Run these synchronously across all instances!
  await mutex.runExclusive( async () => {

    // If we have a package-lock.json, we can do the more efficient 'npm ci' (if clean is requested) or 'npm install'.
    if ( hasPackageLock ) {
      await execute( npmCommand, [ clean ? 'ci' : 'install', ...flags ], directory );
    }
    // Otherwise use the legacy method.
    else {
      await execute( npmCommand, [ 'prune' ], directory );
      await execute( npmCommand, [ 'update' ], directory );
    }
  } );
};

// Oh how I wish for esm syntax
module.exports.getNpmInstallFlags = getNpmInstallFlags;