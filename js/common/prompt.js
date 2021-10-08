// Copyright 2017, University of Colorado Boulder

/**
 * Prompts the user to confirm a message (or enter a specific string or message).
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const readline = require( 'readline' );
const winston = require( 'winston' );

const MAGENTA = '\u001B[35m';
const RESET = '\u001B[0m';

/**
 * Prompts the user to confirm a message (or enter a specific string or message).
 * @public
 *
 * @param {string} prompt - The string to be shown to the user
 * @returns {Promise.<string>} - Resolves with the string entered by the user.
 */
module.exports = function( prompt ) {
  return new Promise( ( resolve, reject ) => {
    winston.debug( `prompting the user with ${prompt}` );

    const rl = readline.createInterface( { input: process.stdin, output: process.stdout } );

    rl.question( MAGENTA + prompt + RESET, answer => {
      rl.close();

      winston.debug( `received answer: ${answer}` );

      resolve( answer );
    } );
  } );
};
