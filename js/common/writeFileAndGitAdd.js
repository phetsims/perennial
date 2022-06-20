// Copyright 2022, University of Colorado Boulder

/**
 * Writes a file with grunt and adds it to git.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const gitAdd = require( './gitAdd' );
const gitIsClean = require( './gitIsClean' );
const grunt = require( 'grunt' );

/**
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} filePath - File name and potentially path relative to the repo
 * @param {string} content - The content of the file as a string
 * @returns {Promise.<string>} - Stdout
 * @rejects {ExecuteError}
 */
module.exports = async function( repo, filePath, content ) {
  const outputFile = `../${repo}/${filePath}`;
  grunt.file.write( outputFile, content );

  const fileClean = await gitIsClean( repo, filePath );
  if ( !fileClean ) {
    await gitAdd( repo, filePath );
  }
};
