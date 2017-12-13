// Copyright 2017, University of Colorado Boulder

/* eslint-env node */
'use strict';

const constants = require( './constants' );
const fs = require( 'fs.extra' ); // eslint-disable-line

/**
 * Write the .htaccess file to make "latest" point to the version being deployed and allow "download" links to work on Safari
 * @param simName
 * @param version
 */
module.exports = function writePhetHtaccess ( simName, version ) {
  const contents = 'RewriteEngine on\n' +
                   'RewriteBase /sims/html/' + simName + '/\n' +
                   'RewriteRule latest(.*) ' + version + '$1\n' +
                   'Header set Access-Control-Allow-Origin "*"\n\n' +
                   'RewriteCond %{QUERY_STRING} =download\n' +
                   'RewriteRule ([^/]*)$ - [L,E=download:$1]\n' +
                   'Header onsuccess set Content-disposition "attachment; filename=%{download}e" env=download\n';
  fs.writeFileSync( constants.HTML_SIMS_DIRECTORY + simName + '/.htaccess', contents );
};