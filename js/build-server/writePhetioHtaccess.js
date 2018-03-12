// Copyright 2017-2018, University of Colorado Boulder

/* eslint-env node */
'use strict';

const writeFile = require( './writeFile' );

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param passwordProtectFilepath - location of .htaccess file for controlling access to wrappers
 * @param authFilepath - location of AuthUserFile on the dev server
 * @param redirectFilepath - location of .htaccess file controlling which sim is in the latest dir
 * @param simName
 * @param version
 */
module.exports = async function writePhetioHtaccess( passwordProtectFilepath, authFilepath, redirectFilepath, simName, version ) {
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