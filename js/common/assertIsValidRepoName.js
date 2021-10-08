// Copyright 2021, University of Colorado Boulder

/**
 * Fails with an assertion if the string is not a valid repo name. See https://github.com/phetsims/chipper/issues/1034.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const assert = require( 'assert' );

/**
 * Fails with an assertion if the string is not a valid repo name. See https://github.com/phetsims/chipper/issues/1034.
 *
 * @param {string} repo
 */
const assertIsValidRepoName = repo => {
  assert( typeof repo === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( repo ), 'repo name should be composed of lowercase a-z characters, optionally with dashes used as separators' );
};

module.exports = assertIsValidRepoName;
