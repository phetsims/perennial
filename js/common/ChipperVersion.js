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
   * @param {boolean} chipperSupportsOutputJSGruntTasks - Flag that indicates whether grunt suppports the family of command `output-js-all`
   */
  function ChipperVersion( major, minor, maintenance, chipperSupportsOutputJSGruntTasks ) {

    assert( typeof major === 'number' && major >= 0 && major % 1 === 0, 'major version should be a non-negative integer' );
    assert( typeof minor === 'number' && minor >= 0 && minor % 1 === 0, 'minor version should be a non-negative integer' );
    assert( typeof maintenance === 'number' && maintenance >= 0 && maintenance % 1 === 0, 'maintenance version should be a non-negative integer' );

    // @public {number}
    this.major = major;
    this.minor = minor;
    this.maintenance = maintenance;
    this.chipperSupportsOutputJSGruntTasks = chipperSupportsOutputJSGruntTasks;
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

  ChipperVersion.getFromPackageJSON = function( packageJSON ) {
    const versionString = packageJSON.version;

    const matches = versionString.match( /(\d+)\.(\d+)\.(\d+)/ );

    if ( !matches ) {
      throw new Error( `could not parse chipper version: ${versionString}` );
    }

    const major = Number( matches[ 1 ] );
    const minor = Number( matches[ 2 ] );
    const maintenance = Number( matches[ 3 ] );
    const chipperSupportsOutputJSGruntTasks = packageJSON.phet && packageJSON.phet.chipperSupportsOutputJSGruntTasks;

    return new ChipperVersion( major, minor, maintenance, chipperSupportsOutputJSGruntTasks );
  };

  /**
   * Returns the chipper version of the currently-checked-out chipper repository.
   * @public
   *
   * @returns {ChipperVersion}
   */
  ChipperVersion.getFromRepository = function() {
    return ChipperVersion.getFromPackageJSON(
      JSON.parse( fs.readFileSync( '../chipper/package.json', 'utf8' ) )
    );
  };

  return ChipperVersion;
} )();
