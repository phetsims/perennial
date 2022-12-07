// Copyright 2017-2018, University of Colorado Boulder

const fs = require( 'graceful-fs' ); // eslint-disable-line require-statement-match
const winston = require( 'winston' );

module.exports = async function( filepath, contents ) {
  return new Promise( ( resolve, reject ) => {
    let tries = 0;
    winston.info( `Writing file to path: ${filepath}` );
    const writeFileInterval = setInterval( () => {
      fs.writeFile( filepath, contents, err => {
        if ( err ) {
          tries += 1;
          if ( err.code === 'ENOENT' ) {
            winston.error( 'Write operation failed. The target directory did not exist.' );
            reject( err );
          }
          else if ( tries >= 10 ) {
            winston.error( `Write operation failed ${tries} time(s). I'm giving up, all hope is lost.` );
            clearInterval( writeFileInterval );
            reject( err );
          }
          else {
            winston.error( `Write failed with error: ${JSON.stringify( err )}, trying again` );
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