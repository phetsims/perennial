// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const fs = require( 'graceful-fs' );
const winston = require( 'winston' );
const writeFile = require( './writeFile' );

/**
 * Create a [sim name].xml file in the live sim directory in htdocs. This file tells the website which
 * translations exist for a given sim. It is used by the "synchronize" method in Project.java in the website code.
 * @param simName
 * @param version
 */
module.exports = async function( simName, version ) {
  const rootdir = '../babel/' + simName;
  const englishStringsFile = simName + '-strings_en.json';
  const stringFiles = [ { name: englishStringsFile, locale: constants.ENGLISH_LOCALE } ];

  // pull all the string filenames and locales from babel and store in stringFiles array
  try {
    const files = fs.readdirSync( rootdir );
    for ( let i = 0; i < files.length; i++ ) {
      const filename = files[ i ];
      const firstUnderscoreIndex = filename.indexOf( '_' );
      const periodIndex = filename.indexOf( '.' );
      const locale = filename.substring( firstUnderscoreIndex + 1, periodIndex );
      stringFiles.push( { name: filename, locale: locale } );
    }
  }
  catch( e ) {
    winston.log( 'warn', 'no directory for the given sim exists in babel' );
  }

  // try opening the english strings file so we can read the english strings
  let englishStrings;
  try {
    englishStrings = JSON.parse( fs.readFileSync( '../' + simName + '/' + englishStringsFile, { encoding: 'utf-8' } ) );
  }
  catch( e ) {
    return Promise.reject( new Error( 'English strings file not found' ) );
  }

  const simTitleKey = simName + '.title'; // all sims must have a key of this form
  let simTitle;
  if ( englishStrings[ simTitleKey ] ) {
    simTitle = englishStrings[ simTitleKey ].value;
  }
  else {
    return Promise.reject( new Error( 'No key for sim title' ) );
  }

  // create xml, making a simulation tag for each language
  let finalXML = '<?xml version="1.0" encoding="utf-8" ?>\n' +
                 '<project name="' + simName + '">\n' +
                 '<simulations>\n';

  for ( let j = 0; j < stringFiles.length; j++ ) {
    const stringFile = stringFiles[ j ];
    const languageJSON = ( stringFile.locale === constants.ENGLISH_LOCALE ) ? englishStrings :
                         JSON.parse( fs.readFileSync( '../babel' + '/' + simName + '/' + stringFile.name, { encoding: 'utf-8' } ) );

    const simHTML = constants.HTML_SIMS_DIRECTORY + simName + '/' + version + '/' + simName + '_' + stringFile.locale + '.html';

    if ( fs.existsSync( simHTML ) ) {
      const localizedSimTitle = ( languageJSON[ simTitleKey ] ) ? languageJSON[ simTitleKey ].value : englishStrings[ simTitleKey ].value;
      finalXML = finalXML.concat( '<simulation name="' + simName + '" locale="' + stringFile.locale + '">\n' +
                                  '<title><![CDATA[' + localizedSimTitle + ']]></title>\n' +
                                  '</simulation>\n' );
    }
  }

  finalXML = finalXML.concat( '</simulations>\n' + '</project>' );

  const xmlFilepath = constants.HTML_SIMS_DIRECTORY + simName + '/' + version + '/' + simName + '.xml';
  try {
    await writeFile( xmlFilepath, finalXML );
  }
  catch ( err ) {
    return Promise.reject( err );
  }
  winston.log( 'info', 'wrote XML file:\n' + fs.readFileSync( xmlFilepath ).toString() );
  return Promise.resolve( simTitle );
};