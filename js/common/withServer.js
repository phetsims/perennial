// Copyright 2017, University of Colorado Boulder

/**
 * A simple webserver that will serve the git root on a specific port for the duration of an async callback
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const http = require( 'http' );
const fs = require( 'fs' );
const _ = require( 'lodash' );
const winston = require( 'winston' );

/**
 * A simple webserver that will serve the git root on a specific port for the duration of an async callback
 * @public
 *
 * @param {async function(port:number):*} asyncCallback
 * @param {Object} [options]
 * @returns {Promise<*>} - Returns the result of the asyncCallback
 */
module.exports = function( asyncCallback, options ) {

  options = _.merge( {
    path: '../',
    port: 0 // 0 means it will find an open port
  }, options );

  return new Promise( ( resolve, reject ) => {


    // Consider using https://github.com/cloudhead/node-static or reading https://nodejs.org/en/knowledge/HTTP/servers/how-to-serve-static-files/
    const server = http.createServer( ( req, res ) => {

      // Trim query string
      const tail = req.url.indexOf( '?' ) >= 0 ? req.url.substring( 0, req.url.indexOf( '?' ) ) : req.url;
      const fullPath = `${process.cwd()}/${options.path}${tail}`;

      // See https://gist.github.com/aolde/8104861
      const mimeTypes = {
        html: 'text/html',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
        js: 'text/javascript',
        css: 'text/css',
        gif: 'image/gif',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',

        // needed to be added to support PhET sims.
        svg: 'image/svg+xml',
        json: 'application/json'
      };
      const fileExtension = fullPath.split( '.' ).pop();
      let mimeType = mimeTypes[ fileExtension ];

      if ( !mimeType && ( fullPath.includes( 'active-runnables' ) || fullPath.includes( 'active-repos' ) ) ) {
        mimeType = 'text/plain';
      }

      if ( !mimeType ) {
        throw new Error( `unsupported mime type, please add above: ${fileExtension}` );
      }
      fs.readFile( fullPath, ( err, data ) => {
        if ( err ) {
          res.writeHead( 404 );
          res.end( JSON.stringify( err ) );
        }
        else {
          res.writeHead( 200, { 'Content-Type': mimeType } );
          res.end( data );
        }
      } );
    } );
    server.on( 'listening', async () => {
      const port = server.address().port;
      winston.debug( 'info', `Server listening on port ${port}` );

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

    server.listen( options.port );
  } );
};
