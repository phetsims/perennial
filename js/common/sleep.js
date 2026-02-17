// Copyright 2020, University of Colorado Boulder

/**
 * Sleeps for a certain number of milliseconds
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

/**
 * Sleeps for a certain number of milliseconds
 * @public
 *
 * @param {number} milliseconds
 * @returns {Promise}
 */
module.exports = async function sleep( milliseconds ) {
  return new Promise( ( resolve, reject ) => {
    setTimeout( resolve, milliseconds );
  } );
};