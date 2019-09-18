// Copyright 2017-2019, University of Colorado Boulder

'use strict';

const buildLocal = require( './buildLocal' );
const devScp = require( '../common/devScp' );
const fs = require( 'graceful-fs' ); //eslint-disable-line
const request = require( 'request-promise-native' ); //eslint-disable-line
const winston = require( 'winston' );
const writeFile = require( './writeFile' );

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param {string} passwordProtectPath - deployment location
 * @param {{simName:string, version:string, directory:string}} [latestOption]
 *      if provided, then we are publishing to production. We then write the /latest/ redirect .htaccess file.
 *      This is only to be used for production deploys by the build-server.
 * @param {string} [devVersionPath] - if provided, scp the htaccess files to here, relatively

 */
module.exports = async function writePhetioHtaccess( passwordProtectPath, latestOption, devVersionPath ) {
  const authFilepath = '/etc/httpd/conf/phet-io_pw';

  const isProductionDeploy = !!latestOption;

  // This option is for production deploys by the build-server
  // If we are provided a simName and version then write a .htaccess file to redirect
  // https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}} to https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}}.{{latest}}{{[-suffix]}}
  if ( isProductionDeploy ) {
    if ( latestOption.simName && latestOption.version && latestOption.directory ) {
      const redirectFilepath = latestOption.directory + latestOption.simName + '/.htaccess';
      let latestRedirectContents = 'RewriteEngine on\n' +
                                   `RewriteBase /sims/${latestOption.simName}/\n`;
      const versions = JSON.parse( await request( buildLocal.productionServerURL + `/services/metadata/phetio?name=${latestOption.simName}&latest=true` ) );
      for ( const v of versions ) {
        // Add a trailing slash to /sims/sim-name/x.y
        latestRedirectContents += `RewriteRule ^${v.versionMajor}.${v.versionMinor}$ ${v.versionMajor}.${v.versionMinor}/ [R=301,L]\n`;
        // Rewrite /sims/sim-name/x.y/* to /sims/sim-name/x.y.z/*
        latestRedirectContents += `RewriteRule ^${v.versionMajor}.${v.versionMinor}/(.*) ${v.versionMajor}.${v.versionMinor}.${v.versionMaintenance}${v.versionSuffix ? '-' : ''}${v.versionSuffix}/$1\n`;
      }
      // 'RewriteRule latest(.*) ' + latestOption.version + '$1\n';
      latestRedirectContents += 'RewriteCond %{QUERY_STRING} =download\n' +
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
      winston.error( `simName: ${latestOption.simName}` );
      winston.error( `version: ${latestOption.version}` );
      winston.error( `directory: ${latestOption.directory}` );
      return Promise.reject( 'latestOption is missing one of the required parameters (simName, version, or directory)' );
    }
  }

  const simPackage = isProductionDeploy ? JSON.parse( fs.readFileSync( `../${latestOption.simName}/package.json` ) ) : null;

  // Only skip htaccess creation if in production deploy when the "allowPublicAccess" flag is present
  if ( !( simPackage && simPackage.phet && simPackage.phet[ 'phet-io' ] && simPackage.phet[ 'phet-io' ].allowPublicAccess ) ) {
    try {
      const passwordProtectWrapperContents = 'AuthType Basic\n' +
                                             'AuthName "PhET-iO Password Protected Area"\n' +
                                             'AuthUserFile ' + authFilepath + '\n' +
                                             'Require valid-user\n';

      // Write a file to add authentication to the ./wrappers directory
      let filePath = 'wrappers/.htaccess';
      await writeFile( `${passwordProtectPath}/${filePath}`, passwordProtectWrapperContents );
      if ( devVersionPath ) {
        await devScp( `${passwordProtectPath}/${filePath}`, `${devVersionPath}/phet-io/${filePath}` );
      }

      const phetioPackage = JSON.parse( fs.readFileSync( '../phet-io/package.json' ) );

      // Write a file to add authentication to the top level index pages
      if ( phetioPackage.phet && phetioPackage.phet.addRootHTAccessFile ) {
        const passwordProtectIndexContents = '<FilesMatch "index.*">\n'
                                             + passwordProtectWrapperContents
                                             + '</FilesMatch>\n';
        filePath = '.htaccess';
        await writeFile( `${passwordProtectPath}/${filePath}`, passwordProtectIndexContents );
        if ( devVersionPath ) {
          await devScp( `${passwordProtectPath}/${filePath}`, `${devVersionPath}/phet-io/${filePath}` );
        }
      }
      winston.debug( 'phetio authentication htaccess written' );
    }
    catch( err ) {
      winston.debug( 'phetio authentication htaccess not written' );
      return Promise.reject( err );
    }
  }
};
