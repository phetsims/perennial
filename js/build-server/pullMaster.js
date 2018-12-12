// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const execute = require( '../common/execute' );
const gitPull = require( '../common/gitPull' );
const winston = require( 'winston' );
const _ = require( 'lodash' ); // eslint-disable-line

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

  // Add babel to list of repos to pull
  reposCopy.babel = true;

  for ( const repoName in reposCopy ) {
    winston.log( 'info', 'pulling from ' + repoName );
    const repoDir = '../' + repoName;

    try {
      await execute( 'git', [ 'checkout', 'master' ], repoDir );
    }
    catch( error ) {
      return Promise.reject( 'git checkout master failed in ' + repoName );
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