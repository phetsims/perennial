// Copyright 2017-2018, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const fs = require( 'graceful-fs' ); // eslint-disable-line phet/require-statement-match
const winston = require( 'winston' );

module.exports = async function( filepath, contents ) {
  return new Promise( ( resolve, reject ) => {
    let tries = 0;
    winston.info( `Writing file to path: ${filepath}` );
    const writeFileInterval = setInterval( () => {
      const onError = err => {
        clearInterval( writeFileInterval );
        reject( err );
      };
      fs.writeFile( filepath, contents, err => {
        if ( err ) {
          tries += 1;
          if ( err.code === 'ENOENT' ) {
            winston.error( `Write operation failed. The target directory did not exist: ${filepath}` );
            onError( err );
          }
          else if ( tries >= 10 ) {
            winston.error( `Write operation failed ${tries} time(s). I'm giving up, all hope is lost: ${filepath}` );
            onError( err );
          }
          else {
            winston.error( `Write failed with error: ${JSON.stringify( err )}, trying again: ${filepath}` );
          }
        }
        else {
          winston.debug( 'Write success.' );
          clearInterval( writeFileInterval );
          resolve();
        }
      } );
    }, 1000 );
  } );
};