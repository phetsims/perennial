// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const execute = require( '../common/execute' );
const fs = require( 'graceful-fs' ); // eslint-disable-line
const gitPull = require( '../common/gitPull' );
const sendEmail = require( './sendEmail' );
const writeFile = require( './writeFile' );

/**
 * Add an entry in for this sim in simInfoArray in rosetta, so it shows up as translatable.
 * Must be run after createTranslationsXML so that simTitle is initialized.
 * @param simTitle
 * @param simName
 * @param email
 *
 * @return Promise
 */
module.exports = async function addToRosetta( simTitle, simName, email ) {
  // start by pulling rosetta to make sure it is up to date and avoid merge conflicts
  try {
    await gitPull( 'rosetta' );
  }
  catch( err ) {
    return Promise.reject( 'Rosetta pull failed' );
  }

  const simInfoArray = '../rosetta/data/simInfoArray.json';

  let simInfoArrayString;
  try {
    simInfoArrayString = fs.readFileSync( simInfoArray, { encoding: 'utf8' } );
  }
  catch( err ) {
    return Promise.reject( 'Sim info array was not readable' );
  }

  const data = JSON.parse( simInfoArrayString );
  const testUrl = constants.BUILD_SERVER_CONFIG.productionServerURL + '/sims/html/' + simName + '/latest/' + simName + '_en.html';
  let newSim = true;

  for ( let i = 0; i < data.length; i++ ) {
    const simInfoObject = data[ i ];
    if ( simInfoObject.projectName && simInfoObject.projectName === simName ) {
      simInfoObject.simTitle = simTitle;
      simInfoObject.testUrl = testUrl;
      newSim = false;
    }
  }

  if ( newSim ) {
    data.push( {
      simTitle: simTitle,
      projectName: simName,
      testUrl: testUrl
    } );
  }

  const contents = JSON.stringify( data, null, 2 );

  try {
    await writeFile( simInfoArray, contents );
  }
  catch( err ) {
    return Promise.reject( 'couldn\'t write simInfoArray ' + err );
  }

  if ( simInfoArrayString !== contents && constants.BUILD_SERVER_CONFIG.productionServerURL.indexOf( '//phet.colorado.edu' ) >= 0 ) {
    try {
      await execute( 'git', [ 'commit', '-a', '-m', '[automated commit] add ' + simTitle + ' to simInfoArray' ], '../rosetta' );
      await execute( 'git', [ 'push', 'origin', 'master' ], '../rosetta' );
    }
    catch( err ) {
      sendEmail( 'ROSETTA PUSH FAILED', err, email );
      return Promise.reject( 'Rosetta push failed' );
    }
  }
};