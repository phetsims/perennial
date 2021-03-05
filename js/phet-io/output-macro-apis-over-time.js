// Copyright 2021, University of Colorado Boulder

const _ = require( 'lodash' ); // eslint-disable-line
const fs = require( 'fs' );
const execute = require( '../common/execute' );
const DateUtils = require( './DateUtils' );

/**
 * This must be in perennial because chipper gets checked out as part of the process.
 *
 * USAGE:
 * cd perennial
 * node js/phet-io/output-macro-apis-over-time.js
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
const simList = fs.readFileSync( 'data/phet-io', 'utf8' ).trim();
const repos = simList.split( '\n' ).filter( repo => repo !== 'perennial' );

const verbose = false;
const restore = false;

( async () => {

  const dates = DateUtils.getTestDates();

  const RESOLVE = { errors: 'resolve' };

  if ( restore ) {
    await Promise.all( repos.map( repo => execute( 'git', [ 'checkout', 'master' ], `../${repo}`, RESOLVE ) ) );
    process.exit( 0 );
  }

  const statusOutput = await Promise.all( repos.map( repo => execute( 'git', [ 'status', '--porcelain' ], `../${repo}`, RESOLVE ) ) );

  const simsWithWorkingCopyChanges = statusOutput.filter( o => o.stdout.trim().length > 0 );
  if ( simsWithWorkingCopyChanges.length > 0 ) {
    console.log( `working copy changes in ${simsWithWorkingCopyChanges.map( o => o.cwd )}` );

    await Promise.all( repos.map( repo => execute( 'git', [ 'checkout', 'master' ], `../${repo}`, RESOLVE ) ) );
    process.exit( 1 );
  }
  console.log( 'working copy is clean, checking out by date' );

  // No working copy changes, we are free to check out things
  for ( let i = 0; i < dates.length; i++ ) {
    const date = dates[ i ];

    const dateString = DateUtils.toGitHubDate( date );

    const shas = await Promise.all( repos.map( repo => execute( 'git', [ 'rev-list', '-n', '1', `--before="${dateString}"`, 'master' ], `../${repo}`, RESOLVE ) ) );

    verbose && console.log( shas );
    const repoSHA = {};
    shas.forEach( sha => { repoSHA[ sha.cwd.substring( sha.cwd.indexOf( '/' ) + 1 ) ] = sha.stdout.trim(); } );
    const checkouts = await Promise.all( repos.map( repo => execute( 'git', [ 'checkout', `${repoSHA[ repo ]}` ], `../${repo}`, RESOLVE ) ) );
    console.log( 'checked out for date' );
    verbose && console.log( checkouts );

    // see if that chipper knows how to generate a macro API
    const generateMacroAPI = require( '../../../chipper/js/phet-io/generateMacroAPI' );
    const formatPhetioAPI = require( '../../../chipper/js/phet-io/formatPhetioAPI' );
    if ( generateMacroAPI.apiVersion === '1.0.0-dev.0' ) {
      const macroAPI = await generateMacroAPI( [ 'natural-selection' ], {
        showProgressBar: true,
        showMessagesFromSim: false
      } );

      const filename = DateUtils.toFilename( date );
      console.log( filename );
      const formattedMacroAPI = formatPhetioAPI( macroAPI );
      try {
        fs.mkdirSync( './build-phet-io-macro-api/' );
      }
      catch( e ) {
        verbose && console.log( 'directory exists' );
      }
      fs.writeFileSync( `./build-phet-io-macro-api/${filename}`, formattedMacroAPI );
    }
  }

  const checkoutMaster = await Promise.all( repos.map( repo => execute( 'git', [ 'checkout', 'master' ], `../${repo}`, RESOLVE ) ) );
  verbose && console.log( checkoutMaster );
  console.log( 'checked out master' );
} )();
