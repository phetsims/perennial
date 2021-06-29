// Copyright 2017, University of Colorado Boulder

/**
 * Handles chipper version information, see https://github.com/phetsims/perennial/issues/78.
 */


const assert = require( 'assert' );
const fs = require( 'fs' );

module.exports = ( function() {

  /**
   * @public
   * @constructor
   *
   * @param {number} major - The major part of the version (the 3 in 3.1.2)
   * @param {number} minor - The minor part of the version (the 1 in 3.1.2)
   * @param {number} maintenance - The maintenance part of the version (the 2 in 3.1.2)
   */
  function ChipperVersion( major, minor, maintenance ) {

    assert( typeof major === 'number' && major >= 0 && major % 1 === 0, 'major version should be a non-negative integer' );
    assert( typeof minor === 'number' && minor >= 0 && minor % 1 === 0, 'minor version should be a non-negative integer' );
    assert( typeof maintenance === 'number' && maintenance >= 0 && maintenance % 1 === 0, 'maintenance version should be a non-negative integer' );

    // @public {number}
    this.major = major;
    this.minor = minor;
    this.maintenance = maintenance;
  }

  // Can't rely on inherit existing
  ChipperVersion.prototype = {
    constructor: ChipperVersion,

    /**
     * Returns a string form of the version.
     * @public
     *
     * @returns {string}
     */
    toString: function() {
      return `${this.major}.${this.minor}.${this.maintenance}`;
    }
  };

  /**
   * Returns the chipper version of the currently-checked-out chipper repository.
   * @public
   *
   * @returns {ChipperVersion}
   */
  ChipperVersion.getFromRepository = function() {

    const versionString = JSON.parse( fs.readFileSync( '../chipper/package.json', 'utf8' ) ).version;

    const matches = versionString.match( /(\d+)\.(\d+)\.(\d+)/ );

    if ( !matches ) {
      throw new Error( `could not parse chipper version: ${versionString}` );
    }

    const major = parseInt( matches[ 1 ], 10 );
    const minor = parseInt( matches[ 2 ], 10 );
    const maintenance = parseInt( matches[ 3 ], 10 );

    return new ChipperVersion( major, minor, maintenance );
  };

  return ChipperVersion;
} )();
