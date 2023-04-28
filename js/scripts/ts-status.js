// Copyright 2022, University of Colorado Boulder
/**
 *
 * The tsc-status script runs through relevant common code repos and counts the lines of code written in javascript
 * and typescript. Provides data on conversion status, as well as occurrences of @ts-expect-error.
 *
 * Run from sims root directory
 * USAGE:
 * cd ${root containing all repos}
 * node ./perennial/js/scripts/ts-status.js
 *
 * @author Marla Schulz (PhET Interactive Simulations)
 */

const _ = require( 'lodash' );
const fs = require( 'fs' );

// The repositories the script will iterate through to produce data
const repos = [
  'axon',
  'brand',
  'chipper',
  'dot',
  'joist',
  'kite',
  'mobius',
  'nitroglycerin',
  'perennial',
  'phet-core',
  'phet-io',
  'phetcommon',
  'phetmarks',
  'scenery',
  'scenery-phet',
  'studio',
  'sun',
  'tambo',
  'tandem',
  'tappi',
  'twixt',
  'utterance-queue',
  'vegas'
];

// Table headers. Begin here to add another data point.
const jsHeader = 'JS';
const tsHeader = 'TS';
const tsExpectErrorHeader = '"@ts-expect-error"';
const completeHeader = '% Complete';
const tableData = {};

const percent = ( numerator, denominator ) => {
  return Math.floor( ( numerator / denominator ) * 100 );
};

// Counts by every line of text in a file vs `wc -l` which counts by every newline.
// Therefore, `wc -l` is inaccurate by at least 1 line per file.
const countLines = path => {
  const text = fs.readFileSync( path, 'utf8' );
  const textLines = text.trim().split( /\r?\n/ );
  return textLines.length;
};

// Uses `.include` to check if word is present in line and then ups word count by 1.
// Does not count multiple uses of same word in one line. For those types of scenarios,
// this function is inaccurate.
const countWord = ( path, word ) => {
  const occurrence = [];
  const text = fs.readFileSync( path, 'utf8' );
  const textLines = text.trim().split( /\r?\n/ );
  textLines.forEach( line => {
    if ( line.includes( word ) ) {
      occurrence.push( word );
    }
  } );
  return occurrence.length;
};

// recursively navigates each repository to find relevant javascript and typescript files
const captureData = ( path, tableData ) => {
  let tsCount = 0;
  let jsCount = 0;
  let tsExpectErrorCount = 0;

  const entries = fs.readdirSync( path );

  entries.forEach( file => {
    const newPath = `${path}/${file}`;

    if ( fs.statSync( newPath ).isDirectory() ) {
      captureData( newPath, tableData );
    }
    else if ( file.match( /\.js$/ ) ) {
      jsCount += countLines( newPath );
    }
    else if ( file.match( /\.ts$/ ) ) {
      tsCount += countLines( newPath );
      tsExpectErrorCount += countWord( newPath, '@ts-expect-error' );
    }
  } );

  // Adds count to respective key in nested repo object.
  tableData[ jsHeader ] += jsCount;
  tableData[ tsHeader ] += tsCount;
  tableData[ tsExpectErrorHeader ] += tsExpectErrorCount;
};

// iterate through list of common code repos to fill out data
repos.forEach( repo => {

  // Sets baseline for nested repo object. New data point baselines should be added here.
  tableData[ repo ] = {
    [ jsHeader ]: 0,
    [ tsHeader ]: 0,
    [ completeHeader ]: 0,
    [ tsExpectErrorHeader ]: 0
  };
  const repoData = tableData[ repo ];

  captureData( `./${repo}/js`, repoData );

  repoData[ completeHeader ] = percent( repoData.TS, repoData.TS + repoData.JS );
} );


// calculates total sum across all provided repos
const rows = Object.values( tableData );
const totalJS = _.sumBy( rows, jsHeader );
const totalTS = _.sumBy( rows, tsHeader );
const totalTSExpectError = _.sumBy( rows, tsExpectErrorHeader );

const summary = `\n --------- SUMMARY ----------
 Total ${tsExpectErrorHeader}: ${totalTSExpectError}
 Total ${jsHeader}: ${totalJS}
 Total ${tsHeader}: ${totalTS}
 ${completeHeader}: ${percent( totalTS, totalTS + totalJS )}%
 `;

console.log( summary );
console.table( tableData );