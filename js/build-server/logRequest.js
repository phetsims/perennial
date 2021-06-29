// Copyright 2017, University of Colorado Boulder


module.exports = function logRequest( req, type, winston ) {
  // log the request, which is useful for debugging
  let requestBodyString = '';
  for ( const key in req[ type ] ) {
    if ( req[ type ].hasOwnProperty( key ) ) {
      requestBodyString += `${key}:${JSON.stringify( req[ type ][ key ] )}\n`;
    }
  }
  winston.log(
    'info',
    `deploy request received, original URL = ${req.protocol}://${req.get( 'host' )}${req.originalUrl}\n${requestBodyString}`
  );
};
