// Copyright 2017-2019, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const buildLocal = require( './buildLocal' );
const devScp = require( './devScp' );
const writeFile = require( './writeFile' );
const axios = require( 'axios' );
const fs = require( 'graceful-fs' ); // eslint-disable-line require-statement-match
const winston = require( 'winston' );

// A list of directories directly nested under the phet-io build output folder that should be password protected. Slashes
// added later.
const PASSWORD_PROTECTED_SUB_DIRS = [ 'wrappers', 'doc' ];

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 * @param {string} passwordProtectPath - deployment location, with no trailing slash
 * @param {
 *  {
 *    [simName]:string,
 *    [version]:string,
 *    [directory]:string,
 *    checkoutDir: string,
 *    isProductionDeploy: boolean
 *  } | null } [latestOption]
 *      if isProductionDeploy is true, then we are publishing to production. We then write the /latest/ redirect .htaccess file.
 *      This is only to be used for production deploys by the build-server. directory is the write destination.
 *      checkoutDir is where the release branch repos live locally.
 *      simName, version, and directory are required if isProductionDeploy is true
 * @param {string} [devVersionPath] - if provided, scp the htaccess files to here, relatively
 */
module.exports = async function writePhetioHtaccess( passwordProtectPath, latestOption, devVersionPath ) {
  const authFilepath = '/etc/httpd/conf/phet-io_pw';

  const isProductionDeploy = latestOption?.isProductionDeploy;

  // This option is for production deploys by the build-server
  // If we are provided a simName and version then write a .htaccess file to redirect
  // https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}} to https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}}.{{latest}}{{[-suffix]}}
  if ( isProductionDeploy ) {
    if ( latestOption.simName && latestOption.version && latestOption.directory && latestOption.checkoutDir ) {
      const redirectFilepath = `${latestOption.directory + latestOption.simName}/.htaccess`;
      let latestRedirectContents = 'RewriteEngine on\n' +
                                   `RewriteBase /sims/${latestOption.simName}/\n`;
      const versions = ( await axios( `${buildLocal.productionServerURL}/services/metadata/phetio?name=${latestOption.simName}&latest=true` ) ).data;
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
      await writeFile( redirectFilepath, latestRedirectContents );
    }
    else {
      winston.error( `simName: ${latestOption.simName}` );
      winston.error( `version: ${latestOption.version}` );
      winston.error( `directory: ${latestOption.directory}` );
      winston.error( `checkoutDir: ${latestOption.checkoutDir}` );
      throw new Error( 'latestOption is missing one of the required parameters (simName, version, directory, or checkoutDir)' );
    }
  }

  const simPackage = isProductionDeploy ? JSON.parse( fs.readFileSync( `${latestOption.checkoutDir}/${latestOption.simName}/package.json` ) ) : null;

  const htaccessFilename = '.htaccess';
  const getSubdirHtaccessPath = subdir => `${subdir}/${htaccessFilename}`;
  const getSubdirHtaccessFullPath = subdir => `${passwordProtectPath}/${getSubdirHtaccessPath( subdir )}`;
  const rootHtaccessFullPath = `${passwordProtectPath}/${htaccessFilename}`;

  // Only allow public accessibility with htaccess mutation if in production deploy when the "allowPublicAccess" flag
  // is present. Commented out lines keep password protection, but comment them in with `allowPublicAccess`.
  let commentSymbol = '#';

  if ( simPackage && simPackage.phet && simPackage.phet[ 'phet-io' ] && simPackage.phet[ 'phet-io' ].allowPublicAccess ) {
    commentSymbol = '';
  }
  try {
    const basePasswordProtectContents = `
AuthType Basic
AuthName "PhET-iO Password Protected Area"
AuthUserFile ${authFilepath}
<LimitExcept OPTIONS>
  Require valid-user
</LimitExcept>
`;

    const passwordProtectWrapperContents = `${basePasswordProtectContents}

# Editing these directly is not supported and will be overwritten by maintenance releases. Please change by modifying 
# the sim's package.json allowPublicAccess flag followed by a re-deploy.
${commentSymbol} Satisfy Any
${commentSymbol} Allow from all
`;

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

    const phetioParentDir = latestOption?.checkoutDir || '..';
    const phetioPackage = JSON.parse( fs.readFileSync( `${phetioParentDir}/phet-io/package.json` ) );

    // We only want to cache for a production deploy, and not on the dev server
    const cachingDirective = isProductionDeploy ? `
# If the request is for a SIM, anything in the /lib or /xhtml dirs, or is the api.json file, then allow it to be cached
<If "-f %{REQUEST_FILENAME} && %{REQUEST_FILENAME} =~ m#(${latestOption.simName}_all.*\\.html|api\\.json|/lib/.*|/xhtml/.*)$#">
  ExpiresActive on
  ExpiresDefault "access plus 1 day"
  Header append Cache-Control "public"
  Header append Cache-Control "stale-while-revalidate=5184000"
  Header append Cache-Control "stale-if-error=5184000"
</If>
` : '';

    // Write a file to add authentication to the top level index pages
    if ( phetioPackage.phet && phetioPackage.phet.addRootHTAccessFile ) {
      const rootHtaccessContent = `<FilesMatch "(index\\.\\w+)$">\n${
        basePasswordProtectContents
      }</FilesMatch>
      
${cachingDirective}
                        
# Editing these directly is not supported and will be overwritten by maintenance releases. Please change by modifying 
# the sim's package.json allowPublicAccess flag followed by a re-deploy.
${commentSymbol} Satisfy Any
${commentSymbol} Allow from all
`;
      await writeFile( rootHtaccessFullPath, rootHtaccessContent );
      if ( devVersionPath ) {
        await devScp( rootHtaccessFullPath, `${devVersionPath}/phet-io/${htaccessFilename}` );
      }
    }
    winston.debug( 'phetio authentication htaccess written' );
  }
  catch( err ) {
    winston.debug( 'phetio authentication htaccess not written' );
    throw err;
  }
};