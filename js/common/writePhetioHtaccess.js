// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const writeFile = require( './writeFile' );

const DEV_AUTH_FILE = '/data/web/htdocs/dev/.htpasswd';
const PRODUCTION_AUTH_FILE = '/etc/httpd/conf/phet-io_pw';

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param {string} passwordProtectFilepath - location of .htaccess file for controlling access to wrappers
 * @param {string} authFilepath - location of AuthUserFile on the dev server\
 * @param {object} [latestOption] - if provided, then write the /latest/ redirect .htaccess file.
 *                                - this is only to be used for production deploys by the build-server
 * @property {string} latestOption.simName
 * @property {string} latestOption.version
 * @property {string} latestOption.directory
 */
module.exports = async function writePhetioHtaccess( passwordProtectFilepath, latestOption ) {
  let authFilepath;

  // This option is for production deploys by the build-server
  // If we are provided a simName and version then write a .htaccess file to redirect
  // https://phet-io.colorado.edu/sims/{{sim-name}}/latest to https://phet-io.colorado.edu/sims/{{sim-name}}/{{version}}
  if ( latestOption ) {
    if ( latestOption.simName && latestOption.version && latestOption.directory ) {
      const redirectFilepath = latestOption.directory + latestOption.simName + '/.htaccess';
      const latestRedirectContents = 'RewriteEngine on\n' +
                                     'RewriteBase /sims/' + latestOption.simName + '/\n' +
                                     'RewriteRule latest(.*) ' + latestOption.version + '$1\n' +
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
    else {
      return Promise.reject( 'latestOption is missing one of the required parameters (simName, version, or directory)' );
    }
    authFilepath = PRODUCTION_AUTH_FILE;
  }
  else {
    authFilepath = DEV_AUTH_FILE;
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
