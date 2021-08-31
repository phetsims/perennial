// Copyright 2015-2021, University of Colorado Boulder

/**
 * Determines whether a repo is marked for TypeScript, which enables the typescript build tools.
 * A repo supports typescript if the package.json has "typescript: true" in the "phet" section.
 * This is a temporary tool until TypeScript is enabled by default for all repos.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

/* eslint-env node */
const fs = require( 'fs' );

/**
 * A repo supports typescript if the package.json has "typescript: true" in the "phet" section.
 * @param {string} repo - the name of a repo, like 'natural-selection'
 * @returns {boolean}
 * @public
 */
const isRepoTypeScript = repo => {
  const packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json` ) );
  const phet = packageObject.phet;
  const typescript = phet.typescript === true;
  return typescript;
};

// so that hook-pre-commit.js knows if it loaded a compatible version
isRepoTypeScript.apiVersion = '1.0';

module.exports = isRepoTypeScript;