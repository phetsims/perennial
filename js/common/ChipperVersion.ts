// Copyright 2017, University of Colorado Boulder

/**
 * Handles chipper version information, see https://github.com/phetsims/perennial/issues/78.
 *
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import assert from 'assert';
import { getPackageJSON } from './getPackageJSON.js';
import { PackageJSON } from '../browser-and-node/PerennialTypes.js';

export class ChipperVersion {
  /**
   * @param major - The major part of the version (the 3 in 3.1.2)
   * @param minor - The minor part of the version (the 1 in 3.1.2)
   * @param maintenance - The maintenance part of the version (the 2 in 3.1.2)
   * @param chipperSupportsOutputJSGruntTasks - Flag that indicates whether grunt supports the family of commands like `output-js-project`
   */
  public constructor(
    public major: number,
    public minor: number,
    public maintenance: number,
    public chipperSupportsOutputJSGruntTasks: boolean
  ) {
    assert( typeof major === 'number' && major >= 0 && major % 1 === 0, 'major version should be a non-negative integer' );
    assert( typeof minor === 'number' && minor >= 0 && minor % 1 === 0, 'minor version should be a non-negative integer' );
    assert( typeof maintenance === 'number' && maintenance >= 0 && maintenance % 1 === 0, 'maintenance version should be a non-negative integer' );
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.maintenance}`;
  }

  public hasBrandBuildDirectories(): boolean {
    return this.major >= 2;
  }

  public static getFromPackageJSON( packageJSON: PackageJSON ): ChipperVersion {
    const versionString = packageJSON.version;

    const matches = versionString.match( /(\d+)\.(\d+)\.(\d+)/ );

    if ( !matches ) {
      throw new Error( `could not parse chipper version: ${versionString}` );
    }

    const major = Number( matches[ 1 ] );
    const minor = Number( matches[ 2 ] );
    const maintenance = Number( matches[ 3 ] );
    const chipperSupportsOutputJSGruntTasks = !!( packageJSON.phet && packageJSON.phet.chipperSupportsOutputJSGruntTasks );

    return new ChipperVersion( major, minor, maintenance, chipperSupportsOutputJSGruntTasks );
  }

  /**
   * Returns the chipper version of the currently-checked-out chipper repository.
   */
  public static async getFromRepository(): Promise<ChipperVersion> {
    return ChipperVersion.getFromPackageJSON( await getPackageJSON( 'chipper' ) );
  }
}