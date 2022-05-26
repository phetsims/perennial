// Copyright 2022, University of Colorado Boulder
/**
 *
 * The tsc-status script runs through relevant common code repos and counts the lines of code written in javascript
 * and typescript. Provides data on conversion status, as well as occurrences of @ts-ignore, and @private.
 *
 * Run from sims root directory
 * USAGE:
 * cd ${root containing all repos}
 * node ./perennial/js/scripts/ts-status.js
 *
 * @author Marla Schulz (PhET Interactive Simulations)
 */

const child_process = require( 'child_process' );

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

const jsHeader = 'JS';
const tsHeader = 'TS';
const tsIgnoreHeader = '"@ts-ignore"';
const privateHeader = '"@private"';
const completeHeader = '% Complete';

// filter and parse stdout to return lines of code count in each repo
const formatCodeCount = result => {
  const filteredResult = result.split( /\r?\n/ ).filter( string => string );
  const linesOfCode = filteredResult && filteredResult.pop();
  const linesOfCodeFormatted = linesOfCode ? linesOfCode.split( ' ' ).filter( string => string ).shift() : '0';
  return Number( linesOfCodeFormatted );
};

// filter and parse stdout to return word count in each repo
const formatWordCount = result => {
  const instances = result.split( /\r?\n/ ).map( string => Number( string.slice( -1 ) ) );
  let count = 0;
  instances.forEach( instance => {
    if ( instance ) {
      count += instance;
    }
  } );
  return count;
};

const percent = ( numerator, denominator ) => {
  return Math.round( ( numerator / denominator ) * 100 );
};

const tableData = {};

// iterate through list of common code repos to fill out data
repos.forEach( repo => {
  const jsResult = child_process.execSync( 'find . -name \'*.js\' | xargs wc -l', { cwd: `${repo}/js` } );
  const tsResult = child_process.execSync( 'find . -name \'*.ts\' | xargs wc -l', { cwd: `${repo}/js` } );
  const tsIgnoreResult = child_process.spawnSync( 'grep -r -c -w @ts-ignore', { cwd: `${repo}/js`, shell: true } );
  const privateResult = child_process.spawnSync( 'grep -r -c -w @private', { cwd: `${repo}/js`, shell: true } );

  const tsCount = formatCodeCount( tsResult.toString() );
  const jsCount = formatCodeCount( jsResult.toString() );
  const tsIgnoreCount = formatWordCount( tsIgnoreResult.stdout.toString() );
  const privateCount = formatWordCount( privateResult.stdout.toString() );

  tableData[ repo ] = {
    [ jsHeader ]: jsCount,
    [ tsHeader ]: tsCount,
    [ completeHeader ]: percent( tsCount, tsCount + jsCount ),
    [ tsIgnoreHeader ]: tsIgnoreCount,
    [ privateHeader ]: privateCount
  };
} );

let totalJS = 0;
let totalTS = 0;
let totalTSIgnore = 0;
let totalPrivate = 0;

Object.keys( tableData ).forEach( repo => {
  const row = tableData[ repo ];

  totalJS += row[ jsHeader ];
  totalTS += row[ tsHeader ];
  totalTSIgnore += row[ tsIgnoreHeader ];
  totalPrivate += row[ privateHeader ];
} );

const summary = `\n --------- SUMMARY ----------
 Total ${tsIgnoreHeader}: ${totalTSIgnore}
 Total ${privateHeader}: ${totalPrivate}
 Total ${jsHeader}: ${totalJS}
 Total ${tsHeader}: ${totalTS}
 ${completeHeader}: ${percent( totalTS, totalTS + totalJS )}%
 `;

console.log( summary );
console.table( tableData );