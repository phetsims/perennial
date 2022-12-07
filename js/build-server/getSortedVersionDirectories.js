// Copyright 2017, University of Colorado Boulder


const fs = require( 'graceful-fs' ); // eslint-disable-line require-statement-match

/**
 * Define a helper function that will get a list of the PhET-style version directories at the given path.  The
 * directories must be named with three numbers separated by periods, e.g. 1.2.5.  The directories are sorted in
 * numerical order, which is different from the lexical ordering used by the Linux file system.  So, for example, valid
 * output from this method could be the array [ "1.1.8", "1.1.9", "1.1.10" ].  For more information on why this is
 * necessary, see https://github.com/phetsims/perennial/issues/28.
 *
 * @param path - Filename of the directory.  It's ok if the path does not exist.
 * @returns {Array} - returns a sorted array of version directories.  Returns an empty array if none exist or if the
 * path does not exist.
 */
module.exports = async function getSortedVersionDirectories( path ) {

  let versions;

  if ( fs.existsSync( path ) ) {
    versions = fs.readdirSync( path );
  }
  else {
    versions = [];
  }

  // filter out names that don't match the required format
  versions = versions.filter( path => {
    const splitPath = path.split( '.' );
    if ( splitPath.length !== 3 ) {
      return false;
    }
    for ( let i = 0; i < 3; i++ ) {
      if ( isNaN( splitPath[ i ] ) ) {
        return false;
      }
    }
    return true;
  } );

  // sort the names in numerical (not lexical) order
  versions.sort( ( a, b ) => {
    const aTokenized = a.split( '.' );
    const bTokenized = b.split( '.' );
    let result = 0;
    for ( let i = 0; i < aTokenized.length; i++ ) {
      if ( Number( aTokenized[ i ] ) < Number( bTokenized[ i ] ) ) {
        result = -1;
        break;
      }
      else if ( Number( aTokenized[ i ] ) > Number( bTokenized[ i ] ) ) {
        result = 1;
        break;
      }
    }
    return result;
  } );
  return versions;
};