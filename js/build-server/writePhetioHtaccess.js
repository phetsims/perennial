// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const fs = require( 'fs.extra' ); // eslint-disable-line

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param filepath - location to write the .htaccess file
 * @param authFilepath - location of AuthUserFile on the dev server
 */
module.exports = function writePhetioHtaccess( filepath, authFilepath ) {
  const contents = 'AuthType Basic\n' +
                   'AuthName "PhET-iO Password Protected Area"\n' +
                   'AuthUserFile ' + authFilepath + '\n' +
                   'Require valid-user\n';
  let count = 0;
  const writeInterval = setInterval( () => {
    try {
      fs.writeFileSync( filepath, contents );
    }
    catch ( e ) {
      winston.error( e );
      winston.info( 'Error writing phetio htaccess, will try again a few times' );
    }
    if ( count >= 10 ) {
      clearInterval( writeInterval );
    }
    count += 1;
  }, 500)
};