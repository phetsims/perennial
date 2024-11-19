// Copyright 2023, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)


const fs = require( 'fs' );
const execute = require( './execute' ).default;
const gitCloneDirectory = require( './gitCloneDirectory' );

module.exports = async function gitCloneOrFetchDirectory( repo, directory ) {
  const repoPwd = `${directory}/${repo}`;

  if ( !fs.existsSync( `${directory}/${repo}` ) ) {
    await gitCloneDirectory( repo, directory );
  }
  else {
    await execute( 'git', [ 'fetch' ], repoPwd );
  }
};