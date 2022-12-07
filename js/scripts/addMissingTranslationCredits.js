// Copyright 2018, University of Colorado Boulder

/**
 *  This script searches babel for all translation credits based on history and adds them to the website database
 *  if not previously added.
 *
 *  @author Matt Pennington
 **/

const buildLocal = require( '../common/buildLocal' );
const fetch = require( 'node-fetch' ); // eslint-disable-line require-statement-match
const fs = require( 'fs' );

const translatorAuthCode = buildLocal.translatorAuthCode;
if ( !translatorAuthCode ) {
  console.log( 'ERROR: translatorAuthCode required in build-local.json' );
}
else {

  let repos;
  let error = null;
  try {
    repos = fs.readFileSync( '../perennial/data/active-sims' )
      .toString()
      .split( '\r\n' )
      .filter( e => e !== '' );
  }
  catch( e ) {
    console.log( e );
    console.log( 'Error processing data/active-sims, this script must be run from the perennial directory' );
    error = e;
  }

  if ( !error ) {

    const usermap = {};

// FIND ALL TRANSLATION CREDITS
    repos.forEach( repo => {
      try {
        const repoPath = `../babel/${repo}/`;
        fs.readdirSync( repoPath ).forEach( localizedFilename => {
          const locale = localizedFilename.slice( ( `${repo}-strings_` ).length, localizedFilename.indexOf( '.' ) );
          const content = JSON.parse( fs.readFileSync( repoPath + localizedFilename ).toString() );
          for ( const stringKey in content ) {
            if ( content.hasOwnProperty( stringKey ) && content[ stringKey ].history ) {
              content[ stringKey ].history.forEach( entry => {
                if ( !usermap[ entry.userId ] ) {
                  usermap[ entry.userId ] = {};
                }
                if ( !usermap[ entry.userId ][ locale ] ) {
                  usermap[ entry.userId ][ locale ] = [];
                }
                if ( !usermap[ entry.userId ][ locale ].includes( repo ) ) {
                  usermap[ entry.userId ][ locale ].push( repo );
                }
              } );
            }
          }

        } );
      }
      catch( e ) {
        // We expect unpublished or test repos to have no translations
        if ( e.code === 'ENOENT' ) {
          console.log( `INFO: no localized files found for ${repo}` );
        }
        // Catch-all
        else {
          console.log( 'WARN: ', e );
        }
      }
    } );

// PREPARE QUEUE
    const urlPath = 'https://phet.colorado.edu/services/add-html-translator?';
    const requests = [];
    for ( const user in usermap ) {
      if ( usermap.hasOwnProperty( user ) ) {
        for ( const locale in usermap[ user ] ) {
          if ( usermap[ user ].hasOwnProperty( locale ) ) {
            usermap[ user ][ locale ].forEach( async repo => {
              const paramString = `simName=${repo
              }&locale=${locale
              }&userId=${user
              }&authorizationCode=${translatorAuthCode}`;
              requests.push( urlPath + paramString );
            } );
          }
        }
      }
    }


// SEND HTTP REQUESTS
    let i = 0;
    const get = async () => {
      console.log( `Fetching ${requests[ i ]}` );
      const response = await fetch( requests[ i ] );
      if ( response.status < 200 || response.status > 299 ) {
        console.log( `ERROR: ${response.status} ${response.statusText}` );
      }
      else {
        console.log( `SUCCESS: ${response.status}` );
      }
      i += 1;
      if ( i < requests.length ) {
        get();
      }
      else {
        console.log( 'FINISHED!' );
      }
    };
    try {
      get();
    }
    catch( e ) {
      console.log( 'ERROR: ', e );
    }
  }
}