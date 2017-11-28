// Copyright 2017, University of Colorado Boulder

/**
 * Sets the version of the current checked-in repo's package.json, creating a commit with the change
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const gitAdd = require( './gitAdd' );
const gitCommit = require( './gitCommit' );
const gitIsClean = require( './gitIsClean' );
const loadJSON = require( './loadJSON' );
const winston = require( 'winston' );
const writeJSON = require( './writeJSON' );

/**
 * Sets the version for a current checked-in repo, creating a commit with the change
 * @public
 *
 * @param {string} repo - The repository name
 * @param {SimVersion} version
 * @returns {Promise}
 */
module.exports = async function( repo, version ) {
  winston.info( `Setting version from package.json for ${repo} to ${version.toString()}` );

  const packageFile = `../${repo}/package.json`;

  const isClean = await gitIsClean( repo );
  if ( !isClean ) {
    throw new Error( `Unclean status in ${repo}, cannot increment version` );
  }

  const packageObject = await loadJSON( packageFile );
  packageObject.version = version.toString();

  await writeJSON( packageFile, packageObject );
  await gitAdd( repo, 'package.json' );
  await gitCommit( repo, `Bumping version to ${version.toString()}` );
};
