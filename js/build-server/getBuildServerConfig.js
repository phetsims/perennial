// Copyright 2002-2015, University of Colorado Boulder


const assert = require( 'assert' );

/**
 * Gets configuration information that is related to deploying sims.
 *
 * All fields are @public (read-only).
 * Fields include:
 *
 * Required:
 * {string} buildServerAuthorizationCode - password that verifies if build request comes from phet team members
 * {string} devUsername - username on our dev server
 *
 * Optional:
 * {string} devDeployServer - name of the dev server, defaults to 'bayes.colorado.edu'
 * {string} devDeployPath - path on dev server to deploy to, defaults to '/data/web/htdocs/dev/html/'
 * {string} productionServerURL - production server url, defaults to 'https://phet.colorado.edu', can be over-ridden to 'https://phet-dev.colorado.edu'
 *
 * Include these fields in build-local.json to enable sending emails from build-server on build failure.
 * They are only needed on the production server, not locally. A valid emailUsername and emailPassword are needed to authenticate
 * sending mail from the smtp server, though the actual emails will be sent from 'PhET Build Server <phethelp@colorado.edu>',
 * not from the address you put here.
 * {string} emailUsername - e.g. "[identikey]@colorado.edu"
 * {string} emailPassword
 * {string} emailServer - (optional: defaults to "smtp.colorado.edu")
 * {string} emailTo - e.g. "Me <[identikey]@colorado.edu>, Another Person <person@example.com>"
 *
 * @author Chris Malley (PixelZoom, Inc.)
 * @author Aaron Davis
 */

/**
 * @param fs - the node fs API
 * @returns {Object} deploy configuration information, fields documented above
 *
 * @private
 */
function getDeployConfig( fs ) {

  //------------------------------------------------------------------------------------
  // read configuration file
  const BUILD_LOCAL_FILENAME = `${process.env.HOME}/.phet/build-local.json`;
  const buildLocalJSON = JSON.parse( fs.readFileSync( BUILD_LOCAL_FILENAME, { encoding: 'utf-8' } ) );
  assert( buildLocalJSON.buildServerAuthorizationCode, `buildServerAuthorizationCode missing from ${BUILD_LOCAL_FILENAME}` );
  assert( buildLocalJSON.devUsername, `devUsername missing from ${BUILD_LOCAL_FILENAME}` );

  //------------------------------------------------------------------------------------
  // Assemble the deployConfig

  return {
    babelBranch: buildLocalJSON.babelBranch || 'master',
    buildServerAuthorizationCode: buildLocalJSON.buildServerAuthorizationCode,
    databaseAuthorizationCode: buildLocalJSON.databaseAuthorizationCode,
    devDeployPath: buildLocalJSON.devDeployPath || '/data/web/htdocs/dev/html/',
    devDeployServer: buildLocalJSON.devDeployServer || 'bayes.colorado.edu',
    devUsername: buildLocalJSON.devUsername,
    emailPassword: buildLocalJSON.emailPassword,
    emailServer: buildLocalJSON.emailServer || 'smtp.office365.com',
    emailTo: buildLocalJSON.emailTo,
    emailUsername: buildLocalJSON.emailUsername,
    htmlSimsDirectory: buildLocalJSON.htmlSimsDirectory,
    phetioSimsDirectory: buildLocalJSON.phetioSimsDirectory,
    pgConnectionString: buildLocalJSON.pgConnectionString,
    productionServerURL: buildLocalJSON.productionServerURL || 'https://phet.colorado.edu',
    serverToken: buildLocalJSON.serverToken,
    verbose: buildLocalJSON.verbose || buildLocalJSON.verbose === 'true'
  };

}

module.exports = getDeployConfig;

