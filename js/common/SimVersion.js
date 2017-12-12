// Copyright 2017, University of Colorado Boulder

/**
 * Handles serializing and deserializing versions for simulations.
 *
 * See https://github.com/phetsims/chipper/issues/560
 */

/* eslint-env browser, node */
'use strict';

(function() {

  /**
   * @constructor
   *
   * @param {number} major - The major part of the version (the 3 in 3.1.2)
   * @param {number} minor - The minor part of the version (the 1 in 3.1.2)
   * @param {number} maintenance - The maintenance part of the version (the 2 in 3.1.2)
   * @param {Object} options
   */
  function SimVersion( major, minor, maintenance, options ) {

    // Can't depend on lodash to be available easily
    // TODO: improve options pattern
    options = options || {};
    options.buildTimestamp = options.buildTimestamp === undefined ? null : options.buildTimestamp;
    options.testType = options.testType === undefined ? null : options.testType;
    options.testNumber = options.testNumber === undefined ? null : options.testNumber;

    if ( typeof major !== 'number' || major < 0 || major % 1 !== 0 ) {
      throw new Error( 'major version should be a non-negative integer' );
    }
    if ( typeof minor !== 'number' || minor < 0 || minor % 1 !== 0 ) {
      throw new Error( 'minor version should be a non-negative integer' );
    }
    if ( typeof maintenance !== 'number' || maintenance < 0 || maintenance % 1 !== 0 ) {
      throw new Error( 'maintenance version should be a non-negative integer' );
    }
    if ( typeof options.testType === 'string' && typeof options.testNumber !== 'number' ) {
      throw new Error( 'if testType is provided, testNumber should be a number' );
    }
    // TODO: handle one-offs?

    // @public {number}
    this.major = major;

    // @public {number}
    this.minor = minor;

    // @public {number}
    this.maintenance = maintenance;

    // @public {string|null}
    this.testType = options.testType;

    // @public {number|null}
    this.testNumber = options.testNumber;

    // @public {string|null} - If provided, like '2015-06-12 16:05:03 UTC' (phet.chipper.buildTimestamp)
    this.buildTimestamp = options.buildTimestamp;
  }

  // Can't rely on inherit existing
  SimVersion.prototype = {
    constructor: SimVersion,

    /**
     * Compares versions, returning -1 if this version is before the passed in version, 0 if equal, or 1 if this version
     * is after.
     * @public
     *
     * This function only compares major/minor/maintenance, leaving other details to the client.
     *
     * @param {SimVersion} version
     */
    compareNumber( version ) {
      if ( this.major < version.major ) { return -1; }
      if ( this.major > version.major ) { return 1; }
      if ( this.minor < version.minor ) { return -1; }
      if ( this.minor > version.minor ) { return 1; }
      if ( this.maintenance < version.maintenance ) { return -1; }
      if ( this.maintenance > version.maintenance ) { return 1; }
      return 0; // equal
    },

    /**
     * Returns whether the simulation (with the given version) is published.
     * @public
     *
     * @returns {boolean}
     */
    get isUnpublished() {
      return this.major >= 1 && this.testType === null;
    },

    /**
     * Returns the string form of the version.
     * @public
     *
     * @returns {string}
     */
    toString() {
      var str = `${this.major}.${this.minor}.${this.maintenance}`;
      if ( typeof this.testType === 'string' ) {
        str += `-${this.testType}.${this.testNumber}`;
      }
      return str;
    }
  };

  /**
   * Parses a sim version from a string form.
   * @public
   *
   * @param {string} versionString - e.g. '1.0.0', '1.0.1-dev.3', etc.
   * @param {string} [buildTimestamp] - Optional build timestamp, like '2015-06-12 16:05:03 UTC' (phet.chipper.buildTimestamp)
   * @returns {SimVersion}
   */
  SimVersion.parse = function( versionString, buildTimestamp ) {
    const matches = versionString.match( /(\d+)\.(\d+)\.(\d+)(-(([^\.-]+)\.(\d+)))?(-([^.-]+))?/ );

    if ( !matches ) {
      throw new Error( 'could not parse version: ' + versionString );
    }

    const major = parseInt( matches[ 1 ], 10 );
    const minor = parseInt( matches[ 2 ], 10 );
    const maintenance = parseInt( matches[ 3 ], 10 );
    const testType = matches[ 6 ];
    const testNumber = matches[ 7 ] === undefined ? matches[ 7 ] : parseInt( matches[ 7 ], 10 );
    // const brand = matches[ 9 ];

    return new SimVersion( major, minor, maintenance, { testType, testNumber, buildTimestamp } );
  };

  // browser require.js-compatible definition
  if ( typeof define !== 'undefined' ) {
    define( function() {
      return SimVersion;
    } );
  }

  // Node.js-compatible definition
  if ( typeof module !== 'undefined' ) {
    module.exports = SimVersion;
  }
})();
