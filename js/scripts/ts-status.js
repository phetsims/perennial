// Copyright 2022, University of Colorado Boulder
/**
 *
 * The tsc-status script runs through relevant common code repos and counts the lines of code written in javascript
 * and typescript. Provides data on conversion status, as well as occurrences of @ts-ignore.
 *
 * Run from sims root directory
 * USAGE:
 * cd ${root containing all repos}
 * node ./perennial/js/scripts/ts-status.js
 *
 * @author Marla Schulz (PhET Interactive Simulations)
 */

// eslint-disable-next-line require-statement-match
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
  'perennial',
  'phet-core',
  'phet-io',
  'phetcommon',
  'phetmarks',
  'scenery',
  'scenery-phet',
  'shred',
  'sun',
  'tambo',
  'tandem',
  'twixt',
  'utterance-queue',
  'vegas'
];

// Table headers. Begin here to add another data point.
const jsHeader = 'JS';
const tsHeader = 'TS';
const tsIgnoreHeader = '"@ts-ignore"';
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
  const lineCount = textLines.length;
  return lineCount;
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
  const wordCount = occurrence.length;
  return wordCount;
};

// recursively navigates each repository to find relevant javascript and typescript files
const captureData = ( repo, tableData ) => {
  let tsCount = 0;
  let jsCount = 0;
  let tsIgnoreCount = 0;

  const startPath = `./${repo}`;
  const entries = fs.readdirSync( startPath );

  entries.forEach( file => {
    const path = `${startPath}/${file}`;

    if ( fs.statSync( path ).isDirectory() ) {
      captureData( path, tableData );
    }
    else if ( file.match( /\.js$/ ) ) {
      const fileCount = countLines( path );
      jsCount += fileCount;
    }
    else if ( file.match( /\.ts$/ ) ) {
      const fileCount = countLines( path );
      tsCount += fileCount;
      const fileTSIgnoreCount = countWord( path, '@ts-ignore' );
      tsIgnoreCount += fileTSIgnoreCount;
    }
  } );

  // Adds count to respective key in nested repo object.
  tableData[ jsHeader ] += jsCount;
  tableData[ tsHeader ] += tsCount;
  tableData[ tsIgnoreHeader ] += tsIgnoreCount;
};

// iterate through list of common code repos to fill out data
repos.forEach( repo => {

  // Sets baseline for nested repo object. New data point baselines should be added here.
  tableData[ repo ] = {
    [ jsHeader ]: 0,
    [ tsHeader ]: 0,
    [ completeHeader ]: 0,
    [ tsIgnoreHeader ]: 0
  };
  const repoData = tableData[ repo ];

  captureData( repo + '/js', repoData );

  repoData[ completeHeader ] = percent( repoData.TS, repoData.TS + repoData.JS );
} );


// calculates total sum across all provided repos
const rows = Object.values( tableData );
const totalJS = _.sumBy( rows, jsHeader );
const totalTS = _.sumBy( rows, tsHeader );
const totalTSIgnore = _.sumBy( rows, tsIgnoreHeader );

const summary = `\n --------- SUMMARY ----------
 Total ${tsIgnoreHeader}: ${totalTSIgnore}
 Total ${jsHeader}: ${totalJS}
 Total ${tsHeader}: ${totalTS}
 ${completeHeader}: ${percent( totalTS, totalTS + totalJS )}%
 `;

console.log( summary );
console.table( tableData );