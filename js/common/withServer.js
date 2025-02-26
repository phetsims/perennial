// Copyright 2017, University of Colorado Boulder

const http = require( 'http' );
const fs = require( 'fs' );
const _ = require( 'lodash' );
const winston = require( 'winston' );

// Memory cache: key is the fullPath, value is { mimeType: string, data: Buffer }
const cache = new Map();

/**
 * A simple webserver that will serve the git root on a specific port for the duration of an async callback,
 * now with an in-memory cache to speed up repeated requests.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 *
 * @param {function(number)} asyncCallback
 * @param {Object} [options]
 * @returns {Promise<*>} - Returns the result of the asyncCallback
 *
 */
module.exports = function( asyncCallback, options ) {

  options = _.merge( {
    path: '../',
    cache: true,
    port: 0 // 0 means it will find an open port
  }, options );

  return new Promise( ( resolve, reject ) => {

    const server = http.createServer( async ( req, res ) => {
      const path = req.url.split( '?' )[ 0 ];
      let url = req.url;
      if ( path.endsWith( '/' ) ) {
        const newPath = path + 'index.html';
        url = url.replace( path, newPath );
      }

      // Trim query string
      const tail = url.indexOf( '?' ) >= 0 ? url.substring( 0, url.indexOf( '?' ) ) : url;
      const fullPath = `${process.cwd()}/${options.path}${tail}`;

      // Mime types
      const mimeTypes = {
        html: 'text/html',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
        js: 'text/javascript',
        mjs: 'text/javascript',
        css: 'text/css',
        gif: 'image/gif',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        svg: 'image/svg+xml',
        json: 'application/json',
        ico: 'image/x-icon'
      };
      const fileExtension = fullPath.split( '.' ).pop();
      let mimeType = mimeTypes[ fileExtension ];

      if ( !mimeType && ( fullPath.includes( 'active-runnables' ) || fullPath.includes( 'active-repos' ) ) ) {
        mimeType = 'text/plain';
      }

      if ( !mimeType ) {
        res.writeHead( 415 );
        res.end( `Unsupported file type: ${fileExtension}` );
        return;
      }

      // Check the cache
      const cachedEntry = cache.get( fullPath );
      if ( options.cache && cachedEntry ) {
        // Serve from cache
        res.writeHead( 200, { 'Content-Type': cachedEntry.mimeType } );
        res.end( cachedEntry.data );
        return;
      }

      // Not in cache, read from disk
      fs.readFile( fullPath, ( err, data ) => {
        if ( err ) {
          res.writeHead( 404 );
          res.end( JSON.stringify( err ) );
        }
        else {
          // Store in cache
          cache.set( fullPath, { mimeType: mimeType, data: data } );
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
        return;
      }

      server.close( () => {
        winston.debug( 'info', `Express stopped listening on port ${port}` );
        resolve( result );
      } );
    } );

    server.listen( options.port );
  } );
};