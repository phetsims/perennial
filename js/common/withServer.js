// Copyright 2017, University of Colorado Boulder

/**
 * A simple webserver that will serve the git root on a specific port for the duration of an async callback
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */


const express = require( 'express' );
const winston = require( 'winston' );

/**
 * A simple webserver that will serve the git root on a specific port for the duration of an async callback
 * @public
 *
 * @param {async function(port:number)} asyncCallback
 * @param {string} [path]
 * @returns {Promise}
 */
module.exports = function( asyncCallback, path = '..' ) {
  return new Promise( ( resolve, reject ) => {
    const app = express();

    app.use( express.static( path ) );

    // start the server
    const server = app.listen( 0, async () => {
      const port = server.address().port;

      winston.debug( 'info', `Express listening on port ${port}` );

      let result;

      try {
        result = await asyncCallback( port );
      }
      catch( e ) {
        reject( e );
      }

      server.close( () => {
        winston.debug( 'info', `Express stopped listening on port ${port}` );

        resolve( result );
      } );
    } );
  } );
};
