// Copyright 2018, University of Colorado Boulder

/**
 * Represents a specific patch being applied to a repository for maintenance purposes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const assert = require( 'assert' );

module.exports = ( function() {

  class Patch {
    /**
     * @public
     * @constructor
     *
     * @param {string} repo
     * @param {string} name
     * @param {string} message - Usually an issue URL, but can include other things
     * @param {Array.<string>} shas - SHAs used to cherry-pick
     */
    constructor( repo, name, message, shas = [] ) {
      assert( typeof repo === 'string' );
      assert( typeof name === 'string' );
      assert( typeof message === 'string' );
      assert( Array.isArray( shas ) );
      shas.forEach( sha => assert( typeof sha === 'string' ) );

      // @public {string}
      this.repo = repo;
      this.name = name;
      this.message = message;

      // @public {Array.<string>}
      this.shas = shas;
    }

    /**
     * Convert into a plain JS object meant for JSON serialization.
     * @public
     *
     * @returns {Object}
     */
    serialize() {
      return {
        repo: this.repo,
        name: this.name,
        message: this.message,
        shas: this.shas
      };
    }

    /**
     * Takes a serialized form of the Patch and returns an actual instance.
     * @public
     *
     * @param {Object}
     * @returns {Patch}
     */
    static deserialize( { repo, name, message, shas } ) {
      return new Patch( repo, name, message, shas );
    }
  }

  return Patch;
} )();
