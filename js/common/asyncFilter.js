// Copyright 2020, University of Colorado Boulder

/**
 * Returns an array filtered asynchronously
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

/**
 * Returns an array filtered asynchronously
 *
 * @param {Array.<*>} list
 * @param {function({*}):*})} f
 * @returns {Promise.<Array.<*>>}
 */
const asyncFilter = async ( list, f ) => {
  const items = [];
  for ( const item of list ) {
    if ( await f( item ) ) {
      items.push( item );
    }
  }
  return items;
};

module.exports = asyncFilter;
