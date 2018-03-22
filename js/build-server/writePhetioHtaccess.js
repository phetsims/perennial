// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const writeFile = require( './writeFile' );

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param {string} passwordProtectFilepath - location of .htaccess file for controlling access to wrappers
 * @param {string} authFilepath - location of AuthUserFile on the dev server\
 * @param {string} [simName] - if provided with version, then write the /latest/ redirect .htaccess file
 * @param {string} [version] - if provided with simName, then write the /latest/ redirect .htaccess file
 */
module.exports = async function writePhetioHtaccess( passwordProtectFilepath, authFilepath, simName, version ) {
  // If we are provided a simName and version then write a .htaccess file to redirect
  // https://phet-io.colorado.edu/sims/{{sim-name}}/latest to https://phet-io.colorado.edu/sims/{{sim-name}}/{{version}}
  if ( simName && version ) {
    const redirectFilepath = constants.PHETIO_SIMS_DIRECTORY + simName + '/.htaccess';
    const latestRedirectContents = 'RewriteEngine on\n' +
                                   'RewriteBase /sims/' + simName + '/\n' +
                                   'RewriteRule latest(.*) ' + version + '$1\n' +
                                   'RewriteCond %{QUERY_STRING} =download\n' +
                                   'RewriteRule ([^/]*)$ - [L,E=download:$1]\n' +
                                   'Header onsuccess set Content-disposition "attachment; filename=%{download}e" env=download\n';
    try {
      await writeFile( redirectFilepath, latestRedirectContents );
    }
    catch( err ) {
      return Promise.reject( err );
    }
  }

  // Always write a file to add authentication to the ./wrappers directory
  const passwordProtectWrapperContents = 'AuthType Basic\n' +
                                         'AuthName "PhET-iO Password Protected Area"\n' +
                                         'AuthUserFile ' + authFilepath + '\n' +
                                         'Require valid-user\n';
  try {
    await writeFile( passwordProtectFilepath, passwordProtectWrapperContents );
  }
  catch( err ) {
    return Promise.reject( err );
  }
};