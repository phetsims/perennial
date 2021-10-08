// Copyright 2020, University of Colorado Boulder

/**
 * Executes async functions on each element in an array.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/**
 * Executes async functions on each element in an array.
 *
 * @param {Array.<*>} list
 * @param {function({*})})} f
 * @returns {Promise}
 */
const asyncForEach = async ( list, f ) => {
  let index = 0;
  for ( const item of list ) {
    await f( item, index++ );
  }
};

module.exports = asyncForEach;
