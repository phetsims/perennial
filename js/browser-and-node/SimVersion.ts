// Copyright 2017-2020, University of Colorado Boulder

/**
 * Handles serializing and deserializing versions for simulations.
 *
 * See https://github.com/phetsims/chipper/issues/560 for discussion on version ID definition.
 *
 * The canonical description of our general versions:
 *
 * Each version string has the form: {{MAJOR}}.{{MINOR}}.{{MAINTENANCE}}[-{{TEST_TYPE}}.{{TEST_NUMBER}}] where:
 *
 * MAJOR: Sequential integer, starts at 1, and is generally incremented when there are significant changes to a simulation.
 * MINOR: Sequential integer, starts at 0, and is generally incremented when there are smaller changes to a simulation.
 *   Resets to 0 whenever the major number is incremented.
 * MAINTENANCE: Sequential integer, starts at 0, and is incremented whenever we build with the same major/minor (but with different SHAs).
 *   Resets to 0 whenever the minor number is incremented.
 * TEST_TYPE (when present): Indicates that this is a non-production build when present. Typically will take the values:
 *   'dev' - A normal dev deployment, which goes to phet-dev.colorado.edu/html/
 *   'rc' -  A release-candidate deployment (off of a release branch). Also goes to phet-dev.colorado.edu/html/ only.
 *   anything else - A one-off deployment name, which is the same name as the branch it was deployed from.
 * TEST_NUMBER (when present): Indicates the version of the test/one-off type (gets incremented for every deployment).
 *   starts at 0 in package.json, but since it is incremented on every deploy, the first version published will be 1.
 *
 * It used to be (pre-chipper-2.0) that sometimes a shortened form of the (non-'phet') brand would be added to the end
 * (e.g. '1.3.0-dev.1-phetio' or '1.3.0-dev.1-adaptedfromphet'), or as a direct prefix for the TEST_TYPE (e.g.
 * 1.1.0-phetiodev.1 or 1.1.0-phetio). We have since moved to a deployment model where there are
 * subdirectories for each brand, so this is no longer part of the version. Since this was not used for any production sim
 * builds that we need statistics from, it is excluded in SimVersion.js or its description.
 *
 * Examples:
 *
 * 1.5.0                - Production simulation version (no test type). Major = 1, minor = 5, maintenance = 0
 * 1.5.0-rc.1           - Example of a release-candidate build version that would be published before '1.5.0' for testing.
 * 1.5.0-dev.1          - Example of a dev build that would be from main.
 * 1.5.0-sonification.1 - Example of a one-off build (which would be from the branch 'sonification')
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

// Include @param and @returns in the JSDoc comments for JSDoc api documentation
/* eslint-disable phet/bad-typescript-text */

import affirm from './affirm.js';

type SimVersionOptions = {
  testType?: string | null;
  testNumber?: number | null;
  buildTimestamp?: string | null;
};

type SimVersionSerialized = {
  major: number;
  minor: number;
  maintenance: number;
  testType: string | null;
  testNumber: number | null;
  buildTimestamp: string | null;
};

export default class SimVersion implements SimVersionSerialized {
  public readonly major: number;
  public readonly minor: number;
  public readonly maintenance: number;
  public readonly testType: string | null;
  public readonly testNumber: number | null;
  public readonly buildTimestamp: string | null; // If provided, like '2015-06-12 16:05:03 UTC' (phet.chipper.buildTimestamp)

  /**
   * @constructor
   *
   * @param {number|string} major - The major part of the version (the 3 in 3.1.2)
   * @param {number|string} minor - The minor part of the version (the 1 in 3.1.2)
   * @param {number|string} maintenance - The maintenance part of the version (the 2 in 3.1.2)
   * @param {Object} [options]
   */
  public constructor( major: number | string, minor: number | string, maintenance: number | string, options: SimVersionOptions = {} ) {

    if ( typeof major === 'string' ) {
      major = Number( major );
    }
    if ( typeof minor === 'string' ) {
      minor = Number( minor );
    }
    if ( typeof maintenance === 'string' ) {
      maintenance = Number( maintenance );
    }
    if ( typeof options.testNumber === 'string' ) {
      options.testNumber = Number( options.testNumber );
    }

    const {
      // {string|null} - If provided, indicates the time at which the sim file was built
      buildTimestamp = null,

      // {string|null} - The test name, e.g. the 'rc' in rc.1. Also can be the one-off version name, if provided.
      testType = null,

      // {number|string|null} - The test number, e.g. the 1 in rc.1
      testNumber = null
    } = options;

    affirm( typeof major === 'number' && major >= 0 && major % 1 === 0, `major version should be a non-negative integer: ${major}` );
    affirm( typeof minor === 'number' && minor >= 0 && minor % 1 === 0, `minor version should be a non-negative integer: ${minor}` );
    affirm( typeof maintenance === 'number' && maintenance >= 0 && maintenance % 1 === 0, `maintenance version should be a non-negative integer: ${maintenance}` );
    affirm( typeof testType !== 'string' || typeof testNumber === 'number', 'if testType is provided, testNumber should be a number' );

    this.major = major;
    this.minor = minor;
    this.maintenance = maintenance;
    this.testType = testType;
    this.testNumber = testNumber;
    this.buildTimestamp = buildTimestamp;
  }

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): SimVersionSerialized {
    return {
      major: this.major,
      minor: this.minor,
      maintenance: this.maintenance,
      testType: this.testType,
      testNumber: this.testNumber,
      buildTimestamp: this.buildTimestamp
    };
  }

  /**
   * @ignore - not needed by PhET-iO Clients
   */
  public get isSimNotPublished(): boolean {
    return !!( this.major < 1 || // e.g. 0.0.0-dev.1
               ( this.major === 1 && // e.g. 1.0.0-dev.1
                 this.minor === 0 &&
                 this.maintenance === 0 &&
                 this.testType ) );
  }

  /**
   * @ignore - not needed by PhET-iO Clients
   */
  public get isSimPublished(): boolean {
    return !this.isSimNotPublished;
  }

  public get majorMinor(): string {
    return `${this.major}.${this.minor}`;
  }

  /**
   * Takes a serialized form of the SimVersion and returns an actual instance.
   */
  public static deserialize( { major, minor, maintenance, testType, testNumber, buildTimestamp }: SimVersionSerialized ): SimVersion {
    return new SimVersion( major, minor, maintenance, {
      testType: testType,
      testNumber: testNumber,
      buildTimestamp: buildTimestamp
    } );
  }

  /**
   * Compares versions, returning -1 if this version is before the passed in version, 0 if equal, or 1 if this version
   * is after.
   *
   * This function only compares major/minor/maintenance, leaving other details to the client.
   *
   * @param {SimVersion} version
   */
  public compareNumber( version: SimVersion ): number {
    return SimVersion.comparator( this, version );
  }

  /**
   * Compares versions in standard "comparator" static format, returning -1 if the first parameter SimVersion is
   * before the second parameter SimVersion in version-string, 0 if equal, or 1 if the first parameter SimVersion is
   * after.
   *
   * This function only compares major/minor/maintenance, leaving other details to the client.
   *
   * @param {SimVersion} a
   * @param {SimVersion} b
   */
  public static comparator( a: SimVersion, b: SimVersion ): number {
    if ( a.major < b.major ) { return -1; }
    if ( a.major > b.major ) { return 1; }
    if ( a.minor < b.minor ) { return -1; }
    if ( a.minor > b.minor ) { return 1; }
    if ( a.maintenance < b.maintenance ) { return -1; }
    if ( a.maintenance > b.maintenance ) { return 1; }
    return 0; // equal
  }

  /**
   * Returns true if the specified version is strictly after this version
   * @param {SimVersion} version
   * @returns {boolean}
   */
  public isAfter( version: SimVersion ): boolean {
    return this.compareNumber( version ) === 1;
  }

  /**
   * Returns true if the specified version matches or comes before this version.
   * @param version
   * @returns {boolean}
   */
  public isBeforeOrEqualTo( version: SimVersion ): boolean {
    return this.compareNumber( version ) <= 0;
  }

  /**
   * Returns the string form of the version. Like "1.3.5".
   *
   * @returns {string}
   */
  public toString(): string {
    let str = `${this.major}.${this.minor}.${this.maintenance}`;
    if ( typeof this.testType === 'string' ) {
      str += `-${this.testType}.${this.testNumber}`;
    }
    return str;
  }

  /**
   * Parses a sim version from a string form.
   *
   * @param {string} versionString - e.g. '1.0.0', '1.0.1-dev.3', etc.
   * @param {string} [buildTimestamp] - Optional build timestamp, like '2015-06-12 16:05:03 UTC' (phet.chipper.buildTimestamp)
   * @returns {SimVersion}
   */
  public static parse( versionString: string, buildTimestamp?: string ): SimVersion {
    const matches = versionString.match( /^(\d+)\.(\d+)\.(\d+)(-(([^.-]+)\.(\d+)))?(-([^.-]+))?$/ );

    if ( !matches ) {
      throw new Error( `could not parse version: ${versionString}` );
    }

    const major = Number( matches[ 1 ] );
    const minor = Number( matches[ 2 ] );
    const maintenance = Number( matches[ 3 ] );
    const testType = matches[ 6 ];
    const testNumber = matches[ 7 ] === undefined ? matches[ 7 ] : Number( matches[ 7 ] );

    return new SimVersion( major, minor, maintenance, {
      testType: testType,
      testNumber: testNumber,
      buildTimestamp: buildTimestamp
    } );
  }

  /**
   * Parses a branch in the form {{MAJOR}}.{{MINOR}} and returns a corresponding version. Uses 0 for the maintenance version (unknown).
   *
   * @param {string} branch - e.g. '1.0'
   * @returns {SimVersion}
   */
  public static fromBranch( branch: string ): SimVersion {
    const bits = branch.split( '.' );
    affirm( bits.length === 2, `Bad branch, should be {{MAJOR}}.{{MINOR}}, had: ${branch}` );

    const major = Number( branch.split( '.' )[ 0 ] );
    const minor = Number( branch.split( '.' )[ 1 ] );

    return new SimVersion( major, minor, 0 );
  }

  /**
   * Ensures that a branch name is ok to be a release branch.
   *
   * @param {string} branch - e.g. '1.0'
   * @ignore - not needed by PhET-iO Clients
   */
  public static ensureReleaseBranch( branch: string ): void {
    const version = SimVersion.fromBranch( branch.split( '-' )[ 0 ] );
    affirm( version.major > 0, 'Major version for a branch should be greater than zero' );
    affirm( version.minor >= 0, 'Minor version for a branch should be greater than (or equal) to zero' );
  }
}