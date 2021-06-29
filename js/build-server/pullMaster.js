// Copyright 2017, University of Colorado Boulder

'use strict';

const constants = require( './constants' );
const execute = require( '../common/execute' );
const gitPull = require( '../common/gitPull' );
const winston = require( 'winston' );
const _ = require( 'lodash' ); // eslint-disable-line

/**
 * pull master for every repo in dependencies.json (plus babel) to make sure everything is up to date
 */
module.exports = async function pullMaster( repos ) { // eslint-disable-line consistent-return
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
    return Promise.reject( 'git checkout/pull failed in babel' );
  }

  for ( const repoName in reposCopy ) {
    winston.log( 'info', `pulling from ${repoName}` );
    const repoDir = `../${repoName}`;

    try {
      await execute( 'git', [ 'checkout', 'master' ], repoDir );
    }
    catch( error ) {
      return Promise.reject( `git checkout master failed in ${repoName}` );
    }

    try {
      await gitPull( repoName );
    }
    catch( error ) {
      errors.push( error );
    }
  }

  if ( errors.length > 0 ) {
    return Promise.reject( 'at least one repository failed to pull master' );
  }
};