// Copyright 2017, University of Colorado Boulder


const constants = require( './constants' );
const execute = require( '../common/execute' );
const gitPull = require( '../common/gitPull' );
const winston = require( 'winston' );
const _ = require( 'lodash' );

/**
 * pull master for every repo in dependencies.json (plus babel) to make sure everything is up to date
 */
module.exports = async function pullMaster( repos ) {

  // so we don't have to modify the repos object
  const reposCopy = _.clone( repos );

  if ( 'comment' in reposCopy ) {
    delete reposCopy.comment;
  }

  const errors = [];

  // Pull the appropriate babel branch
  try {
    await execute( 'git', [ 'checkout', constants.BUILD_SERVER_CONFIG.babelBranch ], '../babel' );
    await gitPull( 'babel' );
  }
  catch( error ) {
    console.error( error );
    throw new Error( 'git checkout/pull failed in babel' );
  }

  for ( const repoName in reposCopy ) {
    winston.log( 'info', `pulling from ${repoName}` );
    const repoDir = `../${repoName}`;

    try {
      await execute( 'git', [ 'checkout', 'master' ], repoDir );
    }
    catch( error ) {
      console.error( error );
      throw new Error( `git checkout master failed in ${repoName}` );
    }

    try {
      await gitPull( repoName );
    }
    catch( error ) {
      errors.push( error );
    }
  }

  if ( errors.length > 0 ) {
    throw new Error( 'at least one repository failed to pull master' );
  }
};