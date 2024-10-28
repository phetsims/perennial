// Copyright 2023, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)


const fs = require( 'fs' );
const execute = require( './execute.js' );
const gitCloneDirectory = require( './gitCloneDirectory.js' );

module.exports = async function gitCloneOrFetchDirectory( repo, directory ) {
  const repoPwd = `${directory}/${repo}`;

  if ( !fs.existsSync( `${directory}/${repo}` ) ) {
    await gitCloneDirectory( repo, directory );
  }
  else {
    await execute( 'git', [ 'fetch' ], repoPwd );
  }
};