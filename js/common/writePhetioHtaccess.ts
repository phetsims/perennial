// Copyright 2017-2019, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const buildLocal = require( './buildLocal' );
const writeFile = require( './writeFile' );
const axios = require( 'axios' );
const fs = require( 'graceful-fs' ); // eslint-disable-line phet/require-statement-match
const winston = require( 'winston' );

// A list of directories directly nested under the phet-io build output folder that should be password protected. Slashes
// added later.
const PASSWORD_PROTECTED_SUB_DIRS = [ 'wrappers', 'doc' ];

// If isProductionDeploy is true, then we are publishing to production. We then write the /latest/ redirect
// .htaccess file. This is only to be used for production deploys by the build-server. directory is the write
// destination.
type LatestOption = {
  checkoutDir: string;  // checkoutDir is where the release branch repos live locally.
} & ( {
  isProductionDeploy?: false;
} | {
  isProductionDeploy: true;
  version: string;
  directory: string;
} );

const htaccessFilename = '.htaccess';

/**
 * Writes the htaccess file to password protect the exclusive content for phet-io sims
 */
export default async function writePhetioHtaccess( simName: string, passwordProtectPath: string, latestOption: LatestOption ): Promise<void> {
  const authFilepath = '/etc/httpd/conf/phet-io_pw';

  const isProductionDeploy = latestOption.isProductionDeploy;

  const simPackage = JSON.parse( fs.readFileSync( `${latestOption.checkoutDir}/${simName}/package.json` ) );
  const phetioPackage = JSON.parse( fs.readFileSync( `${latestOption.checkoutDir}/phet-io/package.json` ) );

  // Only allow public accessibility with htaccess mutation if in production deploy when the "allowPublicAccess" flag
  // is present. Commented out lines keep password protection, but comment them in with `allowPublicAccess`.
  let commentSymbol = '#';

  const phetioPackageBlock = simPackage?.phet && simPackage.phet[ 'phet-io' ];
  if ( isProductionDeploy && phetioPackageBlock?.allowPublicAccess ) {
    commentSymbol = '';
  }

  ///////////////////////////
  // start htaccess content
  const publicAccessDirective = getPublicAccessDirective( commentSymbol, 'allowPublicAccess' );

  const basePasswordProtectContents = `
AuthType Basic
AuthName "PhET-iO Password Protected Area"
AuthUserFile ${authFilepath}
<LimitExcept OPTIONS>
  Require valid-user
</LimitExcept>
`;

  const passwordProtectWrapperContents = `
${basePasswordProtectContents}

${publicAccessDirective}
`;

  // We only want to cache for a production deploy, and not on the dev server
  const cachingDirective = !isProductionDeploy ? '' : `
# If the request is for a SIM, anything in the /lib or /xhtml dirs, or is the api.json file, then allow it to be cached
<If "-f %{REQUEST_FILENAME} && %{REQUEST_FILENAME} =~ m#(${simName}_all.*\\.html|api\\.json|/lib/.*|/xhtml/.*)$#">
  ExpiresActive on
  ExpiresDefault "access plus 1 day"
  Header append Cache-Control "public"
  Header append Cache-Control "stale-while-revalidate=5184000"
  Header append Cache-Control "stale-if-error=5184000"
</If>
`;

  const rootHtaccessContent = `<FilesMatch "(index\\.\\w+)$">\n${
    basePasswordProtectContents
  }</FilesMatch>
      
${cachingDirective}

${publicAccessDirective}
`;

  // end htaccess content
  ///////////////////////////

  try {
    // Write a file to add authentication to the top level index pages
    if ( phetioPackage.phet && phetioPackage.phet.addRootHTAccessFile ) {

      // Write a file to add authentication to subdirectories like wrappers/ or doc/
      for ( const subdir of PASSWORD_PROTECTED_SUB_DIRS ) {
        const fullSubdirPath = `${passwordProtectPath}/${subdir}`;

        // if the directory exists
        fs.existsSync( fullSubdirPath ) && await writeFile( `${fullSubdirPath}/${htaccessFilename}`, passwordProtectWrapperContents );

        // Add an additional .htaccess to individual wrappers that are marked as public
        if ( subdir === 'wrappers' && phetioPackageBlock?.publicWrappers ) {
          for ( const publicWrapper of phetioPackageBlock.publicWrappers ) {

            const publicWrapperContents = getPublicAccessDirective( '', 'publicWrappers' );
            const publicWrapperPath = `${fullSubdirPath}/${publicWrapper}`;
            fs.existsSync( publicWrapperPath ) && await writeFile( `${publicWrapperPath}/${htaccessFilename}`, publicWrapperContents );
          }
        }
      }

      // Root path
      await writeFile( `${passwordProtectPath}/${htaccessFilename}`, rootHtaccessContent );
    }
    winston.debug( 'phetio authentication htaccess written' );
  }
  catch( err ) {
    winston.debug( 'phetio authentication htaccess not written' );
    throw err;
  }

  // This option is for production deploys by the build-server
  // If we are provided a simName and version then write a .htaccess file to redirect
  // https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}} to https://phet-io.colorado.edu/sims/{{sim-name}}/{{major}}.{{minor}}.{{latest}}{{[-suffix]}}
  if ( isProductionDeploy ) {
    if ( simName && latestOption.version && latestOption.directory && latestOption.checkoutDir ) {
      const redirectFilepath = `${latestOption.directory + simName}/${htaccessFilename}`;
      let latestRedirectContents = 'RewriteEngine on\n' +
                                   `RewriteBase /sims/${simName}/\n`;
      const versions = ( await axios( `${buildLocal.productionServerURL}/services/metadata/phetio?name=${simName}&latest=true` ) ).data;
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
      winston.error( `simName: ${simName}` );
      winston.error( `version: ${latestOption.version}` );
      winston.error( `directory: ${latestOption.directory}` );
      winston.error( `checkoutDir: ${latestOption.checkoutDir}` );
      throw new Error( 'latestOption is missing one of the required parameters (simName, version, directory, or checkoutDir)' );
    }
  }
}

function getPublicAccessDirective( commentSymbol: string, packageKey: string ): string {
  return `
# Editing these directly is not supported and will be overwritten by maintenance releases. Please change by modifying 
# the sim's package.json ${packageKey} property followed by a re-deploy.
${commentSymbol} Satisfy Any
${commentSymbol} Allow from all
`;
}