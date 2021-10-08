// Copyright 2017, University of Colorado Boulder

/**
 * Gives a yes-or-no prompt that the user should respond to.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const prompt = require( './prompt' );

/**
 * Gives a yes-or-no prompt that the user should respond to.
 * @public
 *
 * @param {string} question - The string to be shown to the user
 * @param {boolean} noninteractive - If true, skips the prompt
 * @returns {Promise.<boolean>}
 */
module.exports = async function( question, noninteractive ) {
  if ( noninteractive ) {
    return true;
  }

  const answer = await prompt( `${question} [y/N]?` );

  return !( /[Nn]/.test( answer ) ) && /[Yy]/.test( answer );
};
