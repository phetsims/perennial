// Copyright 2018, University of Colorado Boulder

/**
 * Represents a specific patch being applied to a repository for maintenance purposes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

type PatchSerialized = {
  repo: string;
  name: string;
  message: string;
  shas: string[];
};

class Patch implements PatchSerialized {
  public constructor( public readonly repo: string, public readonly name: string, public readonly message: string, public readonly shas: string[] = [] ) {}

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): PatchSerialized {
    return {
      repo: this.repo,
      name: this.name,
      message: this.message,
      shas: this.shas
    };
  }

  /**
   * Takes a serialized form of the Patch and returns an actual instance.
   */
  public static deserialize( { repo, name, message, shas }: PatchSerialized ): Patch {
    return new Patch( repo, name, message, shas );
  }
}

export default Patch;