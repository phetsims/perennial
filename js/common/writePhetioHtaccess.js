// Copyright 2017-2019, University of Colorado Boulder

'use strict';

const buildLocal = require( './buildLocal' );
const devScp = require( '../common/devScp' );
const fs = require( 'graceful-fs' ); //eslint-disable-line
const request = require( 'request-promise-native' ); //eslint-disable-line
const winston = require( 'winston' );
const writeFile = require( './writeFile' );

// A list of directories directly nested under the phet-io build output folder that should be password protected. Slashes
// added later.
const PASSWORD_PROTECTED_SUB_DIRS = [ 'wrappers', 'doc' ];

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param {string} passwordProtectPath - deployment location, with no trailing slash
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

  const htaccessFilename = '.htaccess';
  const getSubdirHtaccessPath = subdir => `${subdir}/${htaccessFilename}`;
  const getSubdirHtaccessFullPath = subdir => `${passwordProtectPath}/${getSubdirHtaccessPath( subdir )}`;
  const rootHtaccessFullPath = `${passwordProtectPath}/${htaccessFilename}`;

  // Only skip htaccess creation if in production deploy when the "allowPublicAccess" flag is present
  // If we are allowing public access, make sure that the htaccess files don't already exist locally already. This can
  // occur when an rc is published (first) during a production deploy.
  if ( simPackage && simPackage.phet && simPackage.phet[ 'phet-io' ] && simPackage.phet[ 'phet-io' ].allowPublicAccess ) {

    for ( const subdir of PASSWORD_PROTECTED_SUB_DIRS ) {

      // Use individual try/catch blocks to ensure atomic operations.
      try {
        await fs.unlinkSync( getSubdirHtaccessFullPath( subdir ) );
      }
      catch( e ) {
        winston.debug( 'did not remove ' + subdir + ' htaccess ' + e );
      }
    }
    try {
      await fs.unlinkSync( rootHtaccessFullPath );
    }
    catch( e ) {
      winston.debug( 'did not remove root htaccess ' + e );
    }
  }
  else {
    try {
      const passwordProtectWrapperContents = 'AuthType Basic\n' +
                                             'AuthName "PhET-iO Password Protected Area"\n' +
                                             'AuthUserFile ' + authFilepath + '\n' +
                                             'Require valid-user\n';

      // Write a file to add authentication to subdirectories like wrappers/ or doc/
      for ( const subdir of PASSWORD_PROTECTED_SUB_DIRS ) {
        const htaccessPathToDir = getSubdirHtaccessFullPath( subdir );

        // if the directory exists
        if ( fs.existsSync( htaccessPathToDir.replace( htaccessFilename, '' ) ) ) {

          await writeFile( htaccessPathToDir, passwordProtectWrapperContents );
          if ( devVersionPath ) {
            await devScp( htaccessPathToDir, `${devVersionPath}/phet-io/${getSubdirHtaccessPath( subdir )}` );
          }
        }
      }

      const phetioPackage = JSON.parse( fs.readFileSync( '../phet-io/package.json' ) );

      // Write a file to add authentication to the top level index pages
      if ( phetioPackage.phet && phetioPackage.phet.addRootHTAccessFile ) {
        const passwordProtectIndexContents = '<FilesMatch "(index\\.\\w+|api\\.json)$">\n'
                                             + passwordProtectWrapperContents
                                             + '</FilesMatch>\n';
        await writeFile( rootHtaccessFullPath, passwordProtectIndexContents );
        if ( devVersionPath ) {
          await devScp( rootHtaccessFullPath, `${devVersionPath}/phet-io/${htaccessFilename}` );
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
