// Copyright 2018-2026, University of Colorado Boulder

/**
 * Represents a specific patch being applied for maintenance purposes.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export type PatchSerialized = {
  name: string;
  message: string;
  shas: string[];
};

export class Patch implements PatchSerialized {
  public constructor(
    public readonly name: string,
    public readonly message: string,
    public readonly shas: string[] = []
  ) {}

  /**
   * Convert into a plain JS object meant for JSON serialization.
   */
  public serialize(): PatchSerialized {
    return {
      name: this.name,
      message: this.message,
      shas: this.shas
    };
  }

  /**
   * Takes a serialized form of the Patch and returns an actual instance.
   */
  public static deserialize( { name, message, shas }: PatchSerialized ): Patch {
    return new Patch( name, message, shas );
  }
}