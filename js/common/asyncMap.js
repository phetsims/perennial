// Copyright 2020, University of Colorado Boulder

/**
 * Returns an array mapped asynchronously
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/**
 * Returns an array mapped asynchronously
 *
 * @param {Array.<*>} list
 * @param {function({*}):*})} f
 * @returns {Promise.<Array.<*>>}
 */
const asyncMap = async ( list, f ) => {
  const items = [];
  let index = 0;
  for ( const item of list ) {
    items.push( await f( item, index++ ) );
  }
  return items;
};

module.exports = asyncMap;
