// Copyright 2022, University of Colorado Boulder

/**
 * Ensures that a simulation is marked as published in its package.json
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const gitAdd = require( './gitAdd' );
const gitCommit = require( './gitCommit' );
const gitPush = require( './gitPush' );
const fs = require( 'fs' );
const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars

/**
 * Ensures that a simulation is marked as published in its package.json
 * @public
 *
 * @param {string} repo
 *
 * @returns {Promise<void>}
 */
module.exports = async function( repo ) {
  const packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );

  if ( !packageObject.phet.published ) {
    packageObject.phet.published = true;
    fs.writeFileSync( `../${repo}/package.json`, JSON.stringify( packageObject, null, 2 ) );

    await gitAdd( repo, 'package.json' );
    await gitCommit( repo, 'Marking repository as published' );
    await gitPush( repo, 'master' );
  }
};
