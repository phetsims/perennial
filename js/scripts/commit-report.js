// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute' );
const _ = require( 'lodash' ); // eslint-disable-line no-unused-vars
const fs = require( 'fs' );

/**
 *
 * Output a formatted view of recent commits to help in writing a report
 *
 * USAGE:
 * cd directory-with-all-repos
 * node perennial/js/scripts/commit-report.js username > report.txt
 *
 * EXAMPLE:
 * node perennial/js/scripts/commit-report.js samreid > report.txt
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
( async () => {
  const args = process.argv.slice( 2 );
  const username = args[ 0 ];

  const months = [ 'Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ];
  if ( !username ) {
    console.log( 'username must be supplied as first command-line argument' );
  }
  else {

    const outputtedLines = [];

    // current timestamp in milliseconds
    const d = new Date( Date.now() );
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    console.log( `${username === 'samreid' ? 'Sam Reid - ' : ''}${months[ month ]} ${day}, ${year}` );
    console.log();

    console.log( 'Highlights' );
    console.log( '' );
    console.log( 'Pose Hours: ' );

    // Don't use getActiveRepos() since it cannot be run from the root
    const contents = fs.readFileSync( 'perennial/data/active-repos', 'utf8' ).trim();
    const repos = contents.split( '\n' ).map( sim => sim.trim() );

    // git --no-pager log --all --remotes --since=7.days --author=$1 --pretty=format:"%an %ad %s" --date=relative
    const gitArgs = [ '--no-pager', 'log', '--all', '--remotes', '--since=7.days', '--pretty=format:"%an %ad %s"', '--date=relative' ];

    const a = repos.map( repo => execute( 'git', gitArgs, `${repo}`, {

      // resolve errors so Promise.all doesn't fail on first repo that cannot pull/rebase
      errors: 'resolve'
    } ) );
    const out = await Promise.all( a );

    // Report results
    for ( let i = 0; i < a.length; i++ ) {

      let outputtedRepo = false;
      const repo = repos[ i ];
      const o = out[ i ];

      if ( o.stderr.trim().length > 0 ) {
        console.log( o.stderr.trim() );
      }

      const stdout = o.stdout.trim();
      if ( stdout.length > 0 || o.stderr.trim().length > 0 ) {


        const lines = stdout.split( '\n' );
        lines.forEach( line => {
          if ( line.startsWith( '"' ) && line.endsWith( '"' ) ) {
            line = line.substring( 1, line.length - 1 );
          }

          if ( line.startsWith( username ) ) {
            line = line.substring( username.length ).trim();

            const tokens = line.split( ' ' );
            const number = Number( tokens[ 0 ] );
            const time = tokens[ 1 ];

            if ( time === 'days' && number <= 7 ) {
              line = line.substring( 'n days ago '.length );
            }
            if ( time === 'hours' && number <= 9 ) {
              line = line.substring( 'n hours ago '.length );
            }
            if ( time === 'hours' && number >= 10 && number <= 99 ) {
              line = line.substring( 'nn hours ago '.length );
            }

            if ( !outputtedLines.find( x => x === line ) && !line.startsWith( 'Merge branch \'master\' of' ) ) {

              if ( !outputtedRepo ) {
                console.log();
                console.log( repo );
                outputtedRepo = true;
              }
              console.log( line );
              outputtedLines.push( line );
            }
          }
        } );

      }
    }
  }
} )();