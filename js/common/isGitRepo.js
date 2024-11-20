// Copyright 2023, University of Colorado Boulder

/**
 * Checks to see if the git repo is initialized.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */
const execute = require( './execute' ).default;

module.exports = async function( repo ) {
  try {

    // an arbitrary command that will fail if the repo is not initialized
    await execute( 'git', [ 'status' ], `../${repo}` );
    return true;
  }
  catch( error ) {
    return false;
  }
};