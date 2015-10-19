// Copyright 2002-2015, University of Colorado Boulder

var assert = require( 'assert' );
var passwdUser = require( 'passwd-user' );


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
 * {string} devDeployServer - name of the dev server, defaults to 'spot.colorado.edu'
 * {string} devDeployPath - path on dev server to deploy to, defaults to '/htdocs/physics/phet/dev/html/'
 * {string} productionServerName - production server name, defaults to 'figaro.colorado.edu', can be over-ridden to 'simian.colorado.edu' for example
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
(function() {

  /**
   * @param fs - the node fs API
   * @returns {Object} deploy configuration information, fields documented above
   *
   * @private
   */
  function getDeployConfig( fs ) {

    //------------------------------------------------------------------------------------
    // read configuration file

    // $HOME/.phet/build-local.json (required)
    var BUILD_LOCAL_FILENAME;

    /*
     * When running on simian or figaro, build-server is run under user "phet-admin". However, "process.env.HOME" will get
     * the user who is starting the process's home directory, not phet-admin's home directory, therefore we need to use
     * a different approach to get the home directory. Because passwd-user doesn't work on windows, windows users
     * will still get their preferences file via process.env.HOME.
     */
    if ( process.platform === 'linux' ) {
      BUILD_LOCAL_FILENAME = passwdUser.sync( process.getuid() ).homedir + '/.phet/build-local.json';

      // set the home environment variable correctly, apparently it is used by npm install an will cause issues if set
      // to the home directory of the user starting the build-server
      process.env.HOME = '/home/phet-admin';
    }
    else {
      BUILD_LOCAL_FILENAME = process.env.HOME + '/.phet/build-local.json';
    }

    var buildLocalJSON = JSON.parse( fs.readFileSync( BUILD_LOCAL_FILENAME, { encoding: 'utf-8' } ) );
    assert( buildLocalJSON.buildServerAuthorizationCode, 'buildServerAuthorizationCode missing from ' + BUILD_LOCAL_FILENAME );
    assert( buildLocalJSON.devUsername, 'devUsername missing from ' + BUILD_LOCAL_FILENAME );

    //------------------------------------------------------------------------------------
    // Assemble the deployConfig

    return {
      buildServerAuthorizationCode: buildLocalJSON.buildServerAuthorizationCode,
      devUsername: buildLocalJSON.devUsername,
      devDeployServer: buildLocalJSON.devDeployServer || 'spot.colorado.edu',
      devDeployPath: buildLocalJSON.devDeployPath || '/htdocs/physics/phet/dev/html/',
      productionServerName: buildLocalJSON.productionServerName || 'figaro.colorado.edu',
      productionServerURL: buildLocalJSON.productionServerURL || 'https://phet.colorado.edu',
      emailUsername: buildLocalJSON.emailUsername,
      emailPassword: buildLocalJSON.emailPassword,
      emailServer: buildLocalJSON.emailServer || 'smtp.colorado.edu',
      emailTo: buildLocalJSON.emailTo
    };

  }

  module.exports = getDeployConfig;
})();
