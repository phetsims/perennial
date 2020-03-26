// Copyright 2020, University of Colorado Boulder

/**
 * Triggered by standard input, tracks changes in status and signifies changes via notifications.
 * PROTOTYPE at the moment, use with caution.
 *
 * USAGE:
 * cd perennial
 * fswatch ../ -e ".*" -i "\\.js$" | grunt listen-for-filesystem-changes
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

const child_process = require( 'child_process' );
const _ = require( 'lodash' ); // eslint-disable-line require-statement-match
const getDataFile = require( '../common/getDataFile' );
const fs = require( 'fs' );

let priorPassing = null;

const callback = () => {

  // Read the data file dynamically each time in case repos were added or removed during processing
  const activeRepos = getDataFile( 'active-repos' );

  // Signify that we are about to check lint.  This does not print a newline, and hence can show when the same pattern
  // (passes or fails) has been happening a long time.
  process.stdout.write( '.' );

  // Don't always require this, as we may have an older chipper checked out
  const lint = require( '../../../chipper/js/grunt/lint' );

  // omit warnings so we don't put notifications and "bonk" sound in the terminal
  const report = lint( activeRepos, true, false, false );

  const passing = report.warningCount === 0 && report.errorCount === 0;
  process.stdout.write( passing ? '💚' : '🔥' );

  if ( priorPassing !== passing ) {
    const textToWrite = passing ? ':green_heart:' : ':fire:';
    fs.writeFileSync( '/Users/samreid/bitbar-data/status.txt', textToWrite );
    child_process.execSync( 'open -g bitbar://refreshPlugin?name=*' );
    if ( passing ) {
      child_process.execSync( 'say Green heart!' );
    }
    else {

      // use preferred pronunciation
      const number = Math.random();
      if ( number < 0.33 ) {
        child_process.execSync( 'say Red a lert, lint errors detected on starbird bough!' );
      }
      else if ( number < 0.66 ) {
        child_process.execSync( 'say Red a lert, lint errors off the port bough!' );
      }
      else {
        child_process.execSync( 'say Shields up! Lint errors incoming!' );
      }
    }

    priorPassing = passing;
  }
};

module.exports = () => {
  process.stdin.resume();
  process.stdin.setEncoding( 'utf8' );

  // Batch changes in case many changes happen at once.
  const debouncedFunction = _.debounce( callback, 500, { leading: false, trailing: true } );

  process.stdin.on( 'data', debouncedFunction );

  console.log( 'lintEverythingDaemon listening to standard input' );
};