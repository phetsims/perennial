// Copyright 2002-2015, University of Colorado Boulder

/**
 * PhET build and deploy server. The server is designed to run on the same host as the production site (phet-server.int.colorado.edu).
 *
 * Starting and Stopping the Server
 * ================================
 *
 * To start, stop, or restart the build server on phet-server, run this command:
 *
 * sudo systemctl [start|stop|restart] build-server
 *
 * To start, stop, or restart the build server on figaro or simian, run this command:
 *
 * sudo /etc/init.d/build-server [start|stop|restart]
 *
 * Build Server Configuration
 * ==========================
 *
 * All of the phet repos live on the production and dev servers under /data/share/phet/phet-repos. The build server
 * lives in perennial: /data/share/phet/phet-repos/perennial/js/build-server.
 *
 * The build-server is run as user "phet-admin". It requires the certain fields filled out in phet-admin's HOME/.phet/build-local.json
 * (see assertions in getBuildServerConfig.js). These fields are already filled out, but they may need to modified or updated.
 *
 * The build server is configured to send an email on build failure. The configuration for sending emails is also in
 * phet-admin's HOME/.phet/build-local.json (these fields are described in getBuildServerConfig.js). To add other email
 * recipients, you can add email addresses to the emailTo field in this file.
 *
 * Additionally, phet-admin needs an ssh key set up to copy files from the production server to spot. This should already be set up,
 * but should you to do to set it up somewhere else, you'll need to have an rsa key in ~/.ssh on the production server and authorized
 * (run "ssh-keygen -t rsa" to generate a key if you don't already have one).
 * Also, you will need to add an entry for spot in ~/.ssh/config like so:
 *
 * Host spot
 *     HostName spot.colorado.edu
 *     User [identikey]
 *     Port 22
 *     IdentityFile ~/.ssh/id_rsa
 *
 * On spot, you'll need to add the public key from phet-server to a file ~/.ssh/authorized_keys
 *
 * build-server log files can be found at /data/share/phet/phet-repos/perennial/build-server.log
 *
 * build-server needs to be able to make commits to github to notify rosetta that a new sim is translatable. To do this,
 * There must be valid git credentials in the .netrc file phet-admin's home directory.
 *
 *
 * Using the Build Server for Production Deploys
 * =============================================
 *
 * The build server starts a build process upon receiving and https request to /deploy-html-simulation. It takes as input
 * the following query parameters:
 * - repos - a json object with dependency repos and shas, in the form of dependencies.json files
 * - locales - a comma-separated list of locales to build [optional, defaults to all locales in babel]
 * - simName - the standardized name of the sim, lowercase with hyphens instead of spaces (i.e. area-builder)
 * - version - the version to be built. Production deploys will automatically strip everything after the major.minor.maintenance
 * - authorizationCode - a password to authorize legitimate requests
 * - option - optional parameter, can be set to "rc" to do an rc deploy instead of production
 *
 * Note: You will NOT want to assemble these request URLs manually, instead use "grunt deploy-production" for production deploys and
 * "grunt deploy-rc" for rc deploys.
 *
 *
 * What the Build Server Does
 * ==========================
 *
 * The build server does the following steps when a deploy request is received:
 * - checks the authorization code, unauthorized codes will not trigger a build
 * - puts the build task on a queue so multiple builds don't occur simultaneously
 * - pull perennial and npm update
 * - clone missing repos
 * - pull master for the sim and all dependencies
 * - grunt checkout-shas
 * - checkout sha for the current sim
 * - npm update in chipper and the sim directory
 * - grunt build-for-server --brand=phet for selected locales (see chipper's Gruntfile for details)
 *
 * - for rc deploys:
 *    - deploy to spot, checkout master for all repositories, and finish
 *
 * - for production deploys:
 *    - mkdir for the new sim version
 *    - copy the build files to the correct location in the server doc root
 *    - write the .htaccess file for indicating the latest directory and downloading the html files
 *    - write the XML file that tells the website which translations exist
 *    - notify the website that a new simulation/translation is published and should appear
 *    - add the sim to rosetta's simInfoArray and commit and push (if the sim isn't already there)
 *    - checkout master for all repositories
 *
 * If any of these steps fails, the build aborts and grunt checkout-master-all is run so all repos are back on master
 *
 * @author Aaron Davis
 */

'use strict';

// modules
var async = require( 'async' );
var child_process = require( 'child_process' );
var dateformat = require( 'dateformat' );
var email = require( 'emailjs/email' );
var express = require( 'express' );
var fs = require( 'fs.extra' );
var getBuildServerConfig = require( './getBuildServerConfig' );
var mimelib = require( 'mimelib' );
var parseArgs = require( 'minimist' );
var parseString = require( 'xml2js' ).parseString;
var query = require( 'pg-query' );
var request = require( 'request' );
var winston = require( 'winston' );

var _ = require( 'lodash' );

// constants
var BUILD_SERVER_CONFIG = getBuildServerConfig( fs );
var LISTEN_PORT = 16371;
var REPOS_KEY = 'repos';
var LOCALES_KEY = 'locales';
var SIM_NAME_KEY = 'simName';
var VERSION_KEY = 'version';
var OPTION_KEY = 'option';
var EMAIL_KEY = 'email';
var USER_ID_KEY = 'userId';
var AUTHORIZATION_KEY = 'authorizationCode';
var HTML_SIMS_DIRECTORY = BUILD_SERVER_CONFIG.htmlSimsDirectory;
var ENGLISH_LOCALE = 'en';
var PERENNIAL = '.';

// set this process up with the appropriate permissions, value is in octal
process.umask( parseInt( '0002', 8 ) );

// for storing an email address to send build failure emails to that is passed as a parameter on a per build basis
var emailParameter = null;

// Handle command line input
// First 2 args provide info about executables, ignore
var commandLineArgs = process.argv.slice( 2 );

var parsedCommandLineOptions = parseArgs( commandLineArgs, {
  boolean: true
} );

var defaultOptions = {
  verbose: BUILD_SERVER_CONFIG.verbose, // can be overridden by a flag on the command line

  // options for supporting help
  help: false,
  h: false
};

for ( var key in parsedCommandLineOptions ) {
  if ( key !== '_' && parsedCommandLineOptions.hasOwnProperty( key ) && !defaultOptions.hasOwnProperty( key ) ) {
    console.error( 'Unrecognized option: ' + key );
    console.error( 'try --help for usage information.' );
    return;
  }
}

// If help flag, print help and usage info
if ( parsedCommandLineOptions.hasOwnProperty( 'help' ) || parsedCommandLineOptions.hasOwnProperty( 'h' ) ) {
  console.log( 'Usage:' );
  console.log( '  node build-server.js [options]' );
  console.log( '' );
  console.log( 'Options:' );
  console.log(
    '  --help (print usage and exit)\n' +
    '    type: bool  default: false\n' +
    '  --verbose (output grunt logs in addition to build-server)\n' +
    '    type: bool  default: false\n'
  );
  return;
}

// Merge the default and supplied options.
var options = _.extend( defaultOptions, parsedCommandLineOptions );

// add timestamps to log messages
winston.remove( winston.transports.Console );
winston.add( winston.transports.Console, {
  'timestamp': function() {
    var now = new Date();
    return dateformat( now, 'mmm dd yyyy HH:MM:ss Z' );
  }
} );

var verbose = options.verbose;

// configure email server
var emailServer;
if ( BUILD_SERVER_CONFIG.emailUsername && BUILD_SERVER_CONFIG.emailPassword && BUILD_SERVER_CONFIG.emailTo ) {
  emailServer = email.server.connect( {
    user: BUILD_SERVER_CONFIG.emailUsername,
    password: BUILD_SERVER_CONFIG.emailPassword,
    host: BUILD_SERVER_CONFIG.emailServer,
    tls: true
  } );
}
else {
  winston.log( 'warn', 'failed to set up email server, missing one or more of the following fields in build-local.json:\n' +
                       'emailUsername, emailPassword, emailTo' );
}

// configure postgres connection
if ( BUILD_SERVER_CONFIG.pgConnectionString ) {
  query.connectionParameters = BUILD_SERVER_CONFIG.pgConnectionString;
}
else {
  query.connectionParameters = 'postgresql://localhost/rosetta';
}

/**
 * Send an email. Used to notify developers if a build fails
 * @param subject
 * @param text
 * @param emailParameterOnly - if true send the email only to the passed in email, not to the default list as well
 */
function sendEmail( subject, text, emailParameterOnly ) {
  if ( emailServer ) {
    var emailTo = BUILD_SERVER_CONFIG.emailTo;

    if ( emailParameter ) {
      if ( emailParameterOnly ) {
        emailTo = emailParameter;
      }
      else {
        emailTo += ( ', ' + emailParameter );
      }
    }

    // don't send an email if no email is given
    if ( emailParameterOnly && !emailParameter ) {
      return;
    }

    winston.log( 'info', 'attempting to send email' );
    emailServer.send( {
        text: text,
        from: 'PhET Build Server <phethelp@colorado.edu>',
        to: emailTo,
        subject: subject
      },
      function( err, message ) {
        if ( err ) {
          winston.log( 'error', 'error when attempted to send email, err = ' + err );
        }
        else {
          winston.log( 'info',                                                                  'sent email to: ' +                                              message.header.to                            +
                               ', subject: ' + mimelib.decodeMimeWord( message.header.subject ) +
                               ', text: '                                                       + message.text );
        }
      }
    );
  }
}

/**
 * exists method that uses fs.statSync instead of the deprecated existsSync
 * @param file
 * @returns {boolean} true if the file exists
 */
function exists( file ) {
  try {
    fs.statSync( file );
    return true;
  }
  catch( e ) {
    return false;
  }
}

/**
 * taskQueue ensures that only one build/deploy process will be happening at the same time.  The main build/deploy logic
 * is here.
 */
var taskQueue = async.queue( function( task, taskCallback ) {

  var req = task.req;
  var res = task.res;

  //-----------------------------------------------------------------------------------------
  // Define helper functions for use in this function
  //-----------------------------------------------------------------------------------------

  /**
   * Execute a step of the build process. The build aborts if any step fails.
   *
   * @param command the command to be executed
   * @param dir the directory to execute the command from
   * @param callback the function that executes upon completion
   */
  var exec = function( command, dir, callback ) {
    winston.log( 'info', 'running command: ' + command );

    child_process.exec( command, { cwd: dir }, function( err, stdout, stderr ) {

      if ( verbose ) {
        if ( stdout ) { winston.log( 'info', stdout ); }
        if ( stderr ) { winston.log( 'info', stderr ); }
      }

      if ( !err ) {
        winston.log( 'info', command + ' ran successfully in directory: ' + dir );
        if ( callback ) { callback(); }
      }
      else {
        if ( command === 'grunt checkout-master-all' ) {

          // checkout master for all repos if the build fails so they don't get left at random shas
          winston.log( 'error', 'error running grunt checkout-master-all in ' + dir + ', build aborted to avoid infinite loop.' );
          taskCallback( 'error running command ' + command + ': ' + err ); // build aborted, so take this build task off of the queue
        }
        else {
          winston.log( 'error', 'error running command: ' + command + ' in ' + dir + ', err: ' + err + ', build aborted.' );
          exec( 'grunt checkout-master-all', PERENNIAL, function() {
            winston.log( 'info', 'checking out master for every repo in case build shas are still checked out' );
            taskCallback( 'error running command ' + command + ': ' + err ); // build aborted, so take this build task off of the queue
          } );
        }
      }
    } );
  };

  var execWithoutAbort = function( command, dir, callback ) {
    child_process.exec( command, { cwd: dir }, function( err, stdout, stderr ) {

      if ( err ) {
        winston.log( 'warn', command + ' had error ' + err );
      }

      if ( verbose ) {
        if ( stdout ) { winston.log( 'info', stdout ); }
        if ( stderr ) { winston.log( 'info', stderr ); }
      }

      callback( err );
    } );
  };

  /**
   * checkout master everywhere and abort build with err
   * @param err
   */
  var abortBuild = function( err ) {
    winston.log( 'error', 'BUILD ABORTED! ' + err );
    exec( 'grunt checkout-master-all', PERENNIAL, function() {
      winston.log( 'info', 'build aborted: checking out master for every repo in case build shas are still checked out' );
      taskCallback( err ); // build aborted, so take this build task off of the queue
    } );
  };

  //-------------------------------------------------------------------------------------
  // Parse and validate query parameters
  //-------------------------------------------------------------------------------------

  var repos = JSON.parse( decodeURIComponent( req.query[ REPOS_KEY ] ) );
  var locales = ( req.query[ LOCALES_KEY ] ) ? decodeURIComponent( req.query[ LOCALES_KEY ] ) : null;
  var simName = decodeURIComponent( req.query[ SIM_NAME_KEY ] );
  var version = decodeURIComponent( req.query[ VERSION_KEY ] );
  var option = req.query[ OPTION_KEY ] ? decodeURIComponent( req.query[ OPTION_KEY ] ) : 'default';

  // this var may
  emailParameter = req.query[ EMAIL_KEY ] ? decodeURIComponent( req.query[ EMAIL_KEY ] ) : null;

  var userId;
  if ( req.query[ USER_ID_KEY ] ) {
    userId = decodeURIComponent( req.query[ USER_ID_KEY ] );
    winston.log( 'info', 'setting userId = ' + userId );
  }

  var simNameRegex = /^[a-z-]+$/;

  // make sure the repos passed in validates
  for ( var key in repos ) {

    // make sure all keys in repos object are valid sim names
    if ( !simNameRegex.test( key ) ) {
      abortBuild( 'invalid simName in repos: ' + simName );
      return;
    }

    var value = repos[ key ];
    if ( key === 'comment' ) {
      if ( typeof value !== 'string' ) {
        abortBuild( 'invalid comment in repos: should be a string' );
        return;
      }
    }
    else if ( value instanceof Object && value.hasOwnProperty( 'sha' ) ) {
      if ( !/^[a-f0-9]{40}$/.test( value.sha ) ) {
        abortBuild( 'invalid sha in repos. key: ' + key + ' value: ' + value + ' sha: ' + value.sha );
        return;
      }
    }
    else {
      abortBuild( 'invalid item in repos. key: ' + key + ' value: ' + value );
      return;
    }
  }

  // validate simName
  if ( !simNameRegex.test( simName ) ) {
    abortBuild( 'invalid simName ' + simName );
    return;
  }

  // validate version and strip suffixes since just the numbers are used in the directory name on dev and production servers
  var versionMatch = version.match( /^(\d+\.\d+\.\d+)(?:-.*)?$/ );
  if ( versionMatch && versionMatch.length === 2 ) {

    if ( option === 'rc' ) {

      // if deploying an rc version use the -rc.[number] suffix
      version = versionMatch[ 0 ];
    }
    else {

      // otherwise strip any suffix
      version = versionMatch[ 1 ];
    }
    winston.log( 'info', 'detecting version number: ' + version );
  }
  else {
    abortBuild( 'invalid version number: ' + version );
    return;
  }

  // define vars for build dir and sim dir
  var buildDir = './js/build-server/tmp';
  var simDir = '../' + simName;

  winston.log( 'info', 'building sim ' + simName );


  //-------------------------------------------------------------------------------------
  // Define other helper functions used in build process
  //-------------------------------------------------------------------------------------

  /**
   * Get all of the deployed locales from the latest version before publishing the next version,
   * so we know which locales to rebuild.
   * @param {string} locales
   * @param {Function} callback
   */
  var getLocales = function( locales, callback ) {
    var callbackLocales;

    if ( locales && locales !== '*' ) {

      // from rosetta
      callbackLocales = locales;
    }
    else {

      // from grunt deploy-production
      var simDirectory = HTML_SIMS_DIRECTORY + simName;
      if ( exists( simDirectory ) ) {
        var files = fs.readdirSync( simDirectory );
        var latest = files.sort()[ files.length - 1 ];
        var translationsXMLFile = HTML_SIMS_DIRECTORY + simName + '/' + latest + '/' + simName + '.xml';
        var xmlString = fs.readFileSync( translationsXMLFile );
        parseString( xmlString, function( err, xmlData ) {
          if ( err ) {
            winston.log( 'error', 'parsing XML ' + err );
          }
          else {
            winston.log( 'info', JSON.stringify( xmlData, null, 2 ) );
            var simsArray = xmlData.project.simulations[ 0 ].simulation;
            var localesArray = [];
            for ( var i = 0; i < simsArray.length; i++ ) {
              localesArray.push( simsArray[ i ].$.locale );
            }
            callbackLocales = localesArray.join( ',' );
          }
        } );
      }
      else {

        // first deploy, sim directory will not exist yet, just publish the english version
        callbackLocales = 'en';
      }
    }

    winston.log( 'info', 'building locales=' + callbackLocales );
    callback( callbackLocales );
  };

  /**
   * Create a [sim name].xml file in the live sim directory in htdocs. This file tells the website which
   * translations exist for a given sim. It is used by the "synchronize" method in Project.java in the website code.
   * @param simTitleCallback
   * @param callback
   */
  var createTranslationsXML = function( simTitleCallback, callback ) {

    var rootdir = '../babel/' + simName;
    var englishStringsFile = simName + '-strings_en.json';
    var stringFiles = [ { name: englishStringsFile, locale: ENGLISH_LOCALE } ];

    // pull all the string filenames and locales from babel and store in stringFiles array
    try {
      var files = fs.readdirSync( rootdir );
      for ( var i = 0; i < files.length; i++ ) {
        var filename = files[ i ];
        var firstUnderscoreIndex = filename.indexOf( '_' );
        var periodIndex = filename.indexOf( '.' );
        var locale = filename.substring( firstUnderscoreIndex + 1, periodIndex );
        stringFiles.push( { name: filename, locale: locale } );
      }
    }
    catch( e ) {
      winston.log( 'warn', 'no directory for the given sim exists in babel' );
    }

    // try opening the english strings file so we can read the english strings
    var englishStrings;
    try {
      englishStrings = JSON.parse( fs.readFileSync( '../' + simName + '/' + englishStringsFile, { encoding: 'utf-8' } ) );
    }
    catch( e ) {
      abortBuild( 'English strings file not found' );
      return;
    }

    var simTitleKey = simName + '.title'; // all sims must have a key of this form

    if ( englishStrings[ simTitleKey ] ) {
      simTitleCallback( englishStrings[ simTitleKey ].value );
    }
    else {
      abortBuild( 'no key for sim title' );
      return;
    }

    // create xml, making a simulation tag for each language
    var finalXML = '<?xml version="1.0" encoding="utf-8" ?>\n' +
                   '<project name="' + simName + '">\n' +
                   '<simulations>\n';

    for ( var j = 0; j < stringFiles.length; j++ ) {
      var stringFile = stringFiles[ j ];
      var languageJSON = ( stringFile.locale === ENGLISH_LOCALE ) ? englishStrings :
                         JSON.parse( fs.readFileSync( '../babel' + '/' + simName + '/' + stringFile.name, { encoding: 'utf-8' } ) );

      var simHTML = HTML_SIMS_DIRECTORY + simName + '/' + version + '/' + simName + '_' + stringFile.locale + '.html';

      if ( exists( simHTML ) ) {
        var localizedSimTitle = ( languageJSON[ simTitleKey ] ) ? languageJSON[ simTitleKey ].value : englishStrings[ simTitleKey ].value;
        finalXML = finalXML.concat( '<simulation name="' + simName + '" locale="' + stringFile.locale + '">\n' +
                                    '<title><![CDATA[' + localizedSimTitle + ']]></title>\n' +
                                    '</simulation>\n' );
      }
    }

    finalXML = finalXML.concat( '</simulations>\n' + '</project>' );

    fs.writeFileSync( HTML_SIMS_DIRECTORY + simName + '/' + version + '/' + simName + '.xml', finalXML );
    winston.log( 'info', 'wrote XML file:\n' + finalXML );
    callback();
  };

  /**
   * Write the .htaccess file to make "latest" point to the version being deployed and allow "download" links to work on Safari
   * @param callback
   */
  var writeHtaccess = function( callback ) {
    var contents = 'RewriteEngine on\n' +
                   'RewriteBase /sims/html/' + simName + '/\n' +
                   'RewriteRule latest(.*) ' + version + '$1\n' +
                   'Header set Access-Control-Allow-Origin "*"\n\n' +
                   'RewriteCond %{QUERY_STRING} =download\n' +
                   'RewriteRule ([^/]*)$ - [L,E=download:$1]\n' +
                   'Header onsuccess set Content-disposition "attachment; filename=%{download}e" env=download\n';
    fs.writeFileSync( HTML_SIMS_DIRECTORY + simName + '/.htaccess', contents );
    callback();
  };

  /**
   * Copy files to spot. This function calls scp once for each file instead of using scp -r. The reason for this is that
   * scp -r will create a new directory called 'build' inside the sim version directory if the version directory already
   * exists.
   * @param callback
   */
  var spotScp = function( callback ) {
    var userAtServer = BUILD_SERVER_CONFIG.devUsername + '@' + BUILD_SERVER_CONFIG.devDeployServer;
    var simVersionDirectory = BUILD_SERVER_CONFIG.devDeployPath + simName + '/' + version;

    // mkdir first in case it doesn't exist already
    var mkdirCommand = 'ssh ' + userAtServer + ' \'mkdir -p ' + simVersionDirectory + '\'';
    exec( mkdirCommand, buildDir, function() {

      // copy the files
      var buildDir = simDir + '/build';
      var files = fs.readdirSync( buildDir );

      // after finishing copying the files, chmod to make sure we preserve group write on spot
      var finished = _.after( files.length, function() {
        var chmodCommand = 'ssh ' + userAtServer + ' \'chmod -R g+w ' + simVersionDirectory + '\'';
        exec( chmodCommand, buildDir, callback );
      } );

      for ( var i = 0; i < files.length; i++ ) {

        var filename = files[ i ];

        // TODO: skip non-English version for now because of issues doing lots of transfers, see https://github.com/phetsims/perennial/issues/20
        if ( filename.indexOf( '.html' ) !== -1 && filename.indexOf( '_en' ) === -1 ){
          finished();
          continue;
        }

        exec( 'scp ' + filename + ' ' + userAtServer + ':' + simVersionDirectory, buildDir, finished );
      }
    } );
  };

  /**
   * Add an entry in for this sim in simInfoArray in rosetta, so it shows up as translatable.
   * Must be run after createTranslationsXML so that simTitle is initialized.
   * @param simTitle
   * @param callback
   */
  var addToRosetta = function( simTitle, callback ) {

    // start by pulling rosetta to make sure it is up to date and avoid merge conflicts
    exec( 'git pull', '../rosetta', function() {
      var simInfoArray = '../rosetta/data/simInfoArray.json';
      fs.readFile( simInfoArray, { encoding: 'utf8' }, function( err, simInfoArrayString ) {

        var data = JSON.parse( simInfoArrayString );

        if ( err ) {
          winston.log( 'error', 'couldn\'t read simInfoArray ' + err );
          abortBuild( 'couldn\'t read simInfoArray ' + err );
        }
        else {

          var testUrl = BUILD_SERVER_CONFIG.productionServerURL + '/sims/html/' + simName + '/latest/' + simName + '_en.html';
          var newSim = true;

          for ( var i = 0; i < data.length; i++ ) {
            var simInfoObject = data[ i ];
            if ( simInfoObject.projectName && simInfoObject.projectName === simName ) {
              simInfoObject.simTitle = simTitle;
              simInfoObject.testUrl = testUrl;
              newSim = false;
            }
          }

          if ( newSim ) {
            data.push( {
              simTitle: simTitle,
              projectName: simName,
              testUrl: testUrl
            } );
          }

          var contents = JSON.stringify( data, null, 2 );

          fs.writeFile( simInfoArray, contents, function( err ) {
            if ( err ) {
              winston.log( 'error', 'couldn\'t write simInfoArray ' + err );
              abortBuild( 'couldn\'t write simInfoArray ' + err );
            }
            else {
              if ( simInfoArrayString !== contents ) {
                exec( 'git commit -a -m "[automated commit] add ' + simTitle + ' to simInfoArray"', '../rosetta', function() {
                  execWithoutAbort( 'git push origin master', '../rosetta', function( err ) {
                    if ( err ) {
                      sendEmail( 'ROSETTA PUSH FAILED', err );
                    }
                    callback();
                  } );
                } );
              }
              else {
                callback();
              }
            }
          } );
        }
      } );
    } );
  };

  /**
   * pull master for every repo in dependencies.json (plus babel) to make sure everything is up to date
   * @param callback
   */
  var pullMaster = function( callback ) {

    // so we don't have to modify the repos object
    var reposCopy = _.clone( repos );

    if ( 'comment' in reposCopy ) {
      delete reposCopy.comment;
    }

    var errors = [];

    var finished = _.after( Object.keys( reposCopy ).length + 1, function() {
      if ( _.any( errors ) ) {
        abortBuild( 'at least one repository failed to pull master' );
      }
      else {
        callback();
      }
    } );

    var errorCheckCallback = function( err ) {
      errors.push( err );
      finished();
    };

    for ( var repoName in reposCopy ) {
      if ( reposCopy.hasOwnProperty( repoName ) ) {
        winston.log( 'info', 'pulling from ' + repoName );
        execWithoutAbort( 'git pull', '../' + repoName, errorCheckCallback );
      }
    }

    execWithoutAbort( 'git pull', '../babel', errorCheckCallback );
  };

  /**
   * execute mkdir for the sim version directory if it doesn't exist
   * @param callback
   */
  var mkVersionDir = function( callback ) {
    var simDirPath = HTML_SIMS_DIRECTORY + simName + '/' + version + '/';
    try {
      fs.mkdirpSync( simDirPath );
      callback();
    }
    catch( e ) {
      winston.log( 'error', 'in mkVersionDir ' + e );
      winston.log( 'error', 'build failed' );
      abortBuild( e );
    }
  };

  /**
   * Notify the website that a new sim or translation has been deployed. This will cause the project to
   * synchronize and the new translation will appear on the website.
   * @param callback
   */
  var notifyServer = function( callback ) {
    var project = 'html/' + simName;
    var url = BUILD_SERVER_CONFIG.productionServerURL + '/services/synchronize-project?projectName=' + project + '&locales=' + locales;

    request( {
      url: url,
      auth: {
        user: 'token',
        pass: BUILD_SERVER_CONFIG.serverToken,
        sendImmediately: true
      }
    }, function( error, response, body ) {
      var errorMessage;

      if ( !error && response.statusCode === 200 ) {
        var syncResponse = JSON.parse( body );

        if ( !syncResponse.success ) {
          errorMessage = 'request to synchronize project ' + project + ' on ' + BUILD_SERVER_CONFIG.productionServerName + ' failed with message: ' + syncResponse.error;
          winston.log( 'error', errorMessage );
          sendEmail( 'SYNCHRONIZE FAILED', errorMessage );
        }
        else {
          winston.log( 'info', 'request to synchronize project ' + project + ' on ' + BUILD_SERVER_CONFIG.productionServerName + ' succeeded' );
        }
      }
      else {
        errorMessage = 'request to synchronize project errored or returned a non 200 status code';
        winston.log( 'error', errorMessage );
        sendEmail( 'SYNCHRONIZE FAILED', errorMessage );
      }

      if ( callback ) {
        callback();
      }
    } );
  };

  // define a helper function that will add the translator to the DB for translation credits
  var addTranslator = function( locale, callback ) {

    // create the URL
    var addTranslatorURL = BUILD_SERVER_CONFIG.productionServerURL + '/services/add-html-translator?simName=' + simName +
                           '&locale=' + locale + '&userId=' + userId + '&authorizationCode=' +
                           BUILD_SERVER_CONFIG.databaseAuthorizationCode;

    // log the URL
    winston.log( 'info', 'URL for adding translator to credits = ' + addTranslatorURL );

    // send the request
    request( addTranslatorURL, function( error, response ) {
      if ( error ) {
        winston.log( 'error', 'error occurred when attempting to add translator credit info to DB: ' + error );
      }
      else {
        winston.log( 'info', 'request to add translator credit info returned code: ' + response.statusCode );
      }
      callback();
    } );
  };

  /**
   * Clean up after deploy. Checkout master for every repo and remove tmp dir.
   */
  var afterDeploy = function() {
    exec( 'grunt checkout-master-all', PERENNIAL, function() {
      exec( 'rm -rf ' + buildDir, '.', function() {
        taskCallback();
      } );
    } );
  };

  /**
   * Write a dependencies.json file based on the the dependencies passed to the build server.
   * The reason to write this to a file instead of using the in memory values, is so the "grunt checkout-shas"
   * task works without much modification.
   */
  var writeDependenciesFile = function() {
    fs.writeFile( buildDir + '/dependencies.json', JSON.stringify( repos ), function( err ) {
      if ( err ) {
        winston.log( 'error', err );
        taskCallback( err );
      }
      else {
        winston.log( 'info', 'wrote file ' + buildDir + '/dependencies.json' );

        var simTitle; // initialized via simTitleCallback in createTranslationsXML() for use in addToRosetta()
        var simTitleCallback = function( title ) {
          simTitle = title;
        };
        
        // run every step of the build
        exec( 'git pull', PERENNIAL, function() {
          exec( 'npm prune', PERENNIAL, function() {
            exec( 'npm update', PERENNIAL, function() {
              exec( './chipper/bin/clone-missing-repos.sh', '..', function() { // clone missing repos in case any new repos exist that might be dependencies
                pullMaster( function() {
                  exec( 'grunt checkout-shas --buildServer=true --repo=' + simName, PERENNIAL, function() {
                    exec( 'git checkout ' + repos[ simName ].sha, simDir, function() { // checkout the sha for the current sim
                      exec( 'npm prune', '../chipper', function() {
                        exec( 'npm update', '../chipper', function() { // npm update in chipper in case there are new dependencies there
                          exec( 'npm prune', simDir, function() {
                            exec( 'npm update', simDir, function() {
                              getLocales( locales, function( locales ) {
                                exec( 'grunt build-for-server --brand=phet --locales=' + locales, simDir, function() {
                                  if ( option === 'rc' ) {
                                    spotScp( afterDeploy );
                                  }
                                  else {
                                    mkVersionDir( function() {
                                      exec( 'cp build/* ' + HTML_SIMS_DIRECTORY + simName + '/' + version + '/', simDir, function() {
                                        writeHtaccess( function() {
                                          createTranslationsXML( simTitleCallback, function() {
                                            notifyServer( function() {
                                              addToRosetta( simTitle, function() {

                                                // if this build request comes from rosetta it will have a userId field and only one locale
                                                var localesArray = locales.split( ',' );
                                                if ( userId && localesArray.length === 1 && localesArray[ 0 ] !== '*' ) {
                                                  addTranslator( localesArray[ 0 ], afterDeploy );
                                                }
                                                else {
                                                  afterDeploy();
                                                }
                                              } );
                                            } );
                                          } );
                                        } );
                                      } );
                                    } );
                                  }
                                } );
                              } );
                            } );
                          } );
                        } );
                      } );
                    } );
                  } );
                } );
              } );
            } );
          } );
        } );
      }
    } );
  };

  try {
    fs.mkdirSync( buildDir );
  }
  catch( e ) {
    // do nothing, most likely failed because the directory already exists, which is fine
  }
  finally {
    writeDependenciesFile();
  }

  res.send( 'build process initiated, check logs for details' );

}, 1 ); // 1 is the max number of tasks that can run concurrently

function queueDeploy( req, res ) {

  // log the original URL, which is useful for debugging
  winston.log(
    'info',
    'deploy request received, original URL = ' + ( req.protocol + '://' + req.get( 'host' ) + req.originalUrl )
  );

  var repos = req.query[ REPOS_KEY ];
  var simName = req.query[ SIM_NAME_KEY ];
  var version = req.query[ VERSION_KEY ];
  var locales = req.query[ LOCALES_KEY ];
  var authorizationKey = req.query[ AUTHORIZATION_KEY ];

  if ( repos && simName && version && authorizationKey ) {
    if ( authorizationKey !== BUILD_SERVER_CONFIG.buildServerAuthorizationCode ) {
      var err = 'wrong authorization code';
      winston.log( 'error', err );
      res.send( err );
    }
    else {
      winston.log( 'info', 'queuing build for ' + simName + ' ' + version );
      taskQueue.push( { req: req, res: res }, function( err ) {
        var simInfoString = 'Sim = ' + decodeURIComponent( simName ) +
                            ' Version = ' + decodeURIComponent( version ) +
                            ' Locales = ' + ( locales ? decodeURIComponent( locales ) : 'undefined' );

        if ( err ) {
          var shas = decodeURIComponent( repos );

          // try to format the JSON nicely for the email, but don't worry if it is invalid JSON
          try {
            shas = JSON.stringify( JSON.parse( shas ), null, 2 );
          }
          catch( e ) {
            // invalid JSON
          }
          var errorMessage = 'Build failed with error: ' + err + '. ' + simInfoString + ' Shas = ' + shas;
          winston.log( 'error', errorMessage );
          sendEmail( 'BUILD ERROR', errorMessage );
        }
        else {
          winston.log( 'info', 'build for ' + simName + ' finished successfully' );
          sendEmail( 'Build Succeeded', simInfoString, true );
        }

        // reset email parameter to null after build finishes or errors, since this email address may be different on every build
        emailParameter = null;
      } );
    }
  }
  else {
    var errorString = 'missing one or more required query parameters: repos, simName, version, authorizationKey';
    winston.log( 'error', errorString );
    res.send( errorString );
  }
}

// Create the ExpressJS app
var app = express();

// add the route to build and deploy
app.get( '/deploy-html-simulation', queueDeploy );

// start the server
app.listen( LISTEN_PORT, function() {
  winston.log( 'info', 'Listening on port ' + LISTEN_PORT );
  winston.log( 'info', 'Verbose mode: ' + verbose );
} );
