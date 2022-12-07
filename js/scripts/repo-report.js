// Copyright 2018, University of Colorado Boulder

/**
 * usage:
 * cd {{repo}}
 * node ../perennial/js/scripts/repo-report.js > out.txt
 * then import in Excel
 *
 * @author Sam Reid (PhET Interactive Simulations)
 *
 * TODO https://github.com/phetsims/tasks/issues/942 This is a "quick" version which could benefit from documentation, better command line hygiene, more options, etc.
 */

const { exec } = require( 'child_process' ); // eslint-disable-line require-statement-match

exec( 'git rev-list master', ( error, stdout, stderr ) => {
  if ( error ) {
    console.error( `exec error: ${error}` );
    return;
  }

  if ( stderr.length === 0 && stdout.length !== 0 ) {
    const lines = stdout.trim().split( /\n/ ).reverse();
    console.log( 'sha\tdate\tLOC\tTODO\tREVIEW' );
    const visit = function( index ) {

      exec( `git checkout ${lines[ index ]}`, ( error, stdout, stderr ) => {

        exec( 'grep -ro "TODO" ./js/ | wc -l', ( error, stdout, stderr ) => {
          const todoCount = stdout.trim();

          exec( 'grep -ro "REVIEW" ./js/ | wc -l', ( error, stdout, stderr ) => {
            const reviewCount = stdout.trim();

            exec( 'git log -1 --format=format:\'%ai\'', ( error, stdout, stderr ) => {
              const date = stdout.trim();

              exec( '( find ./js/ -name \'*.js\' -print0 | xargs -0 cat ) | wc -l', ( error, stdout, stderr ) => {
                const lineCount = stdout.trim();

                // console.log( 'hello ' + lines[ index ] );
                // console.log( stdout.trim() );
                // console.log( stdout.trim() );
                console.log( `${lines[ index ]}\t${date}\t${lineCount}\t${todoCount}\t${reviewCount}` );
                if ( index < lines.length - 1 ) {
                  visit( index + 1 );
                }
                else {

                  // done
                  exec( 'git checkout master', ( error, stdout, stderr ) => {
                    // console.log( 'checked out master' );
                  } );
                }
              } );

            } );
          } );
        } );
      } );
    };
    visit( 0 );
  }
} );