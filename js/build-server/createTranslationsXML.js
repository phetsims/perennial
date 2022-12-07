// Copyright 2017-2018, University of Colorado Boulder


const constants = require( './constants' );
const fs = require( 'graceful-fs' ); // eslint-disable-line require-statement-match
const winston = require( 'winston' );
const writeFile = require( '../common/writeFile' );
const parseScreenNames = require( './parseScreenNames' );

/**
 * Create a [sim name].xml file in the live sim directory in htdocs. This file tells the website which
 * translations exist for a given sim. It is used by the "synchronize" method in Project.java in the website code.
 * @param simName
 * @param version
 */
module.exports = async function( simName, version ) {
  const rootdir = `../babel/${simName}`;
  const englishStringsFile = `${simName}-strings_en.json`;
  const stringFiles = [ { name: englishStringsFile, locale: constants.ENGLISH_LOCALE } ];

  // pull all the string filenames and locales from babel and store in stringFiles array
  try {
    const files = fs.readdirSync( rootdir );
    for ( let i = 0; i < files.length; i++ ) {
      const filename = files[ i ];
      const firstUnderscoreIndex = filename.indexOf( '_' );
      const periodIndex = filename.indexOf( '.' );
      const locale = filename.substring( firstUnderscoreIndex + 1, periodIndex );
      // Don't process English twice!
      if ( locale !== constants.ENGLISH_LOCALE ) {
        stringFiles.push( { name: filename, locale: locale } );
      }
    }
  }
  catch( e ) {
    winston.log( 'warn', 'no directory for the given sim exists in babel' );
  }

  // try opening the english strings file so we can read the english strings
  let englishStrings;
  try {
    englishStrings = JSON.parse( fs.readFileSync( `../${simName}/${englishStringsFile}`, { encoding: 'utf-8' } ) );
  }
  catch( e ) {
    throw new Error( 'English strings file not found' );
  }

  const simTitleKey = `${simName}.title`; // all sims must have a key of this form
  if ( !englishStrings[ simTitleKey ] ) {
    throw new Error( 'No key for sim title' );
  }

  // create xml, making a simulation tag for each language
  let finalXML = `<?xml version="1.0" encoding="utf-8" ?>\n<project name="${simName}">\n<simulations>`;

  const screenNames = await parseScreenNames.parseScreenNames( simName, stringFiles.map( f => f.locale ) );

  for ( let j = 0; j < stringFiles.length; j++ ) {
    const stringFile = stringFiles[ j ];
    const languageJSON = ( stringFile.locale === constants.ENGLISH_LOCALE ) ? englishStrings :
                         JSON.parse( fs.readFileSync( `../babel/${simName}/${stringFile.name}`, { encoding: 'utf-8' } ) );

    const simHTML = `${constants.HTML_SIMS_DIRECTORY + simName}/${version}/${simName}_${stringFile.locale}.html`;

    if ( fs.existsSync( simHTML ) ) {
      const localizedSimTitle = ( languageJSON[ simTitleKey ] ) ? languageJSON[ simTitleKey ].value : englishStrings[ simTitleKey ].value;
      finalXML = finalXML.concat( `<simulation name="${simName}" locale="${stringFile.locale}">\n` +
                                  `<title><![CDATA[${localizedSimTitle}]]></title>\n` );
      if ( screenNames && screenNames[ stringFile.locale ] ) {
        finalXML = finalXML.concat( '<screens>\n' );
        screenNames[ stringFile.locale ].forEach( ( screenName, index ) => {
          finalXML = finalXML.concat( `<screenName position="${index + 1}"><![CDATA[${screenName}]]></screenName>\n` );
        } );
        finalXML = finalXML.concat( '</screens>\n' );
      }
      finalXML = finalXML.concat( '</simulation>\n' );
    }
  }

  finalXML = finalXML.concat( '</simulations>\n</project>' );

  const xmlFilepath = `${constants.HTML_SIMS_DIRECTORY + simName}/${version}/${simName}.xml`;
  try {
    await writeFile( xmlFilepath, finalXML );
  }
  catch( err ) {
    console.error( 'Error writing xml file', err );
    throw err;
  }
  winston.log( 'info', 'wrote XML file' );
};