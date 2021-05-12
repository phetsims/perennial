// Copyright 2017, University of Colorado Boulder

/**
 * A simple webserver that will serve the git root on a specific port
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const express = require( 'express' );
const winston = require( 'winston' );

/**
 * A simple webserver that will serve the git root on a specific port
 * @public
 *
 * @param {number} port
 * @returns {Promise}
 */
module.exports = function( port ) {

  const app = express();

  app.use( express.static( '..' ) );

  // start the server
  app.listen( port, () => {
    winston.debug( 'info', `Listening on port ${port}` );
  } );

  return () => {
    app.close();
  };

  /*
    const http = require( 'http' );
    const server = http.createServer( ( req, res ) => {

    // Trim query string
    const tail = req.url.indexOf( '?' ) >= 0 ? req.url.substring( 0, req.url.indexOf( '?' ) ) : req.url;
    const path = `${process.cwd()}/..${tail}`;

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
      wav: 'audio/wav'
    };
    const mimeType = mimeTypes[ path.split( '.' ).pop() ] || 'text/plain';

    fs.readFile( path, ( err, data ) => {
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
  server.listen( 0 );


  ./..


    server.close();
  server.unref();
  */
};
