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
const completeHeader = '% Complete';

// filter and parse stdout to return lines of code count in each repo
const formatCodeCount = result => {
  //REVIEW: This is a lot of complexity to read the output from a shell command
  //REVIEW: Also, `find . -name '*.js' | xargs cat | wc -l` would concatenate the files together and give you the
  //REVIEW: output in a single line (and result.trim() to get rid of the newlines around it)
  const filteredResult = result.split( /\r?\n/ ).filter( string => string );
  const linesOfCode = filteredResult && filteredResult.pop();
  const linesOfCodeFormatted = linesOfCode ? linesOfCode.split( ' ' ).filter( string => string ).shift() : '0';
  return Number( linesOfCodeFormatted );
};

// filter and parse stdout to return word count in each repo
const formatWordCount = result => {
  //REVIEW: We usually use Number.parseInt or the parseInt global to cast things to a number (though this might work
  //REVIEW: better, so please let me know if we should update what we usually do)
  const instances = result.split( /\r?\n/ ).map( string => Number( string.slice( -1 ) ) );
  //REVIEW: return _.sum( instances ) --- since it seems like instances is an array of JUST numbers? Not sure why
  //REVIEW: there is the `instance &&` check. If needed, `return _.sum( instances.filter( _.identity ) )`
  let count = 0;
  instances.forEach( instance => {
    instance && ( count += instance );
  } );
  return count;
};

const percent = ( numerator, denominator ) => {
  //REVIEW: For this type of thing, I'd use Math.floor (so that it truly needs to be 100% to be shown as 100%)
  return Math.round( ( numerator / denominator ) * 100 );
};

const tableData = {};

// iterate through list of common code repos to fill out data
repos.forEach( repo => {
  //REVIEW: Recommend potentially async/await style code with loading files in as a string (as long as it doesn't kill
  //REVIEW: performance. Collaboration on that sounds good!
  const jsResult = child_process.execSync( 'find . -name \'*.js\' | xargs wc -l', { cwd: `${repo}/js` } );
  const tsResult = child_process.execSync( 'find . -name \'*.ts\' | xargs wc -l', { cwd: `${repo}/js` } );
  const tsIgnoreResult = child_process.spawnSync( 'grep -r -c --include="*.ts" -w @ts-ignore', { cwd: `${repo}/js`, shell: true } );

  const tsCount = formatCodeCount( tsResult.toString() );
  const jsCount = formatCodeCount( jsResult.toString() );
  const tsIgnoreCount = formatWordCount( tsIgnoreResult.stdout.toString() );

  tableData[ repo ] = {
    [ jsHeader ]: jsCount,
    [ tsHeader ]: tsCount,
    [ completeHeader ]: percent( tsCount, tsCount + jsCount ),
    [ tsIgnoreHeader ]: tsIgnoreCount
  };
} );

//REVIEW: Consider using lodash instead of the iteration:
// const _ = require( 'lodash' ); // above
// const rows = Object.values( tableData );
// const totalJS = _.sumBy( rows, jsHeader );
// const totalTS = _.sumBy( rows, tsHeader );
// const totalTSIgnore = _.sumBy( rows, tsIgnoreHeader );
// const totalPrivate = _.sumBy( rows, privateHeader );

let totalJS = 0;
let totalTS = 0;
let totalTSIgnore = 0;

Object.keys( tableData ).forEach( repo => {
  const row = tableData[ repo ];

  totalJS += row[ jsHeader ];
  totalTS += row[ tsHeader ];
  totalTSIgnore += row[ tsIgnoreHeader ];
} );

const summary = `\n --------- SUMMARY ----------
 Total ${tsIgnoreHeader}: ${totalTSIgnore}
 Total ${jsHeader}: ${totalJS}
 Total ${tsHeader}: ${totalTS}
 ${completeHeader}: ${percent( totalTS, totalTS + totalJS )}%
 `;

console.log( summary );
console.table( tableData );