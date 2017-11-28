// Copyright 2017, University of Colorado Boulder

/**
 * Copies a single file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const fs = require( 'fs' );
const winston = require( 'winston' );

/**
 * Copies a single file.
 * @public
 *
 * @param {string} sourceFilename
 * @param {string} destinationFilename
 * @returns {Promise} - Resolves with no value
 */
module.exports = function( sourceFilename, destinationFilename ) {
  return new Promise( ( resolve, reject ) => {
    winston.info( `Copying ${sourceFilename} to ${destinationFilename}` );

    const readStream = fs.createReadStream( sourceFilename );
    const writeStream = fs.createWriteStream( destinationFilename );
    readStream.pipe( writeStream );
    readStream.on( 'end', () => resolve() );
    // TODO: do we need to close the readStream on an error? Can we just assume things will fail out and close the process?
    readStream.on( 'error', err => reject( err ) );
    writeStream.on( 'error', err => reject( err ) );
  } );
};
