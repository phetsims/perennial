// Copyright 2002-2016, University of Colorado Boulder

/**
 * Maintenance-release related utilities and tasks.
 *
 * Almost every process that returns a non-zero exit code (i.e. not success) will halt the currently-running task.
 *
 * TODO: detailed documentation!
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

var child_process = require( 'child_process' );
var xml2js = require( 'xml2js' );
var request = require( 'request' );
var fs = require( 'fs' );
var _ = require( 'lodash' );

/**
 * @param {Object} grunt - For all of your grunting needs.
 * @param {Function} doneCallback - Called with no arguments when the task is done. Our error/success functions will
 *                                  call this.
 */
module.exports = function( grunt, doneCallback ) {
  'use strict';

  return {
    /**
     * Prints out a message, and tells Grunt we're done (since we launch tasks asynchronously).
     * @private
     *
     * @param {string} message
     */
    success: function( message ) {
      grunt.log.ok( message );
      doneCallback();
    },

    /**
     * Prints out a message + stack-trace, and tells Grunt we're done, and errors out hard (to make sure execution
     * doesn't continue if for some reason grunt.log.error doesn't halt things).
     * @private
     *
     * @param {string} message
     */
    error: function( message ) {
      grunt.log.error( message + '\n' + new Error().stack );
      doneCallback();
      throw new Error( message );
    },

    /**
     * Basic assertion, but uses our custom error handling. Always enabled.
     * @private
     *
     * @param {*} value - Checks if its negation is truthy
     * @param {string} message
     */
    assert: function( value, message ) {
      if ( !value ) {
        this.error( 'Assertion failed: ' + message );
      }
    },

    /**
     * Executes a command, with specific arguments and in a specific directory (cwd). When it is completed successfully
     * (exit code of the process was 0), the callback will be called.
     * @private
     *
     * If the command fails (exit code non-zero), the error override callback will be called (if available), otherwise
     * we default to the hard-error "halt everything" approach for safety.
     *
     * @param {string} cmd - The process to execute. Should be on the current path.
     * @param {Array.<string>} args - Array of arguments. No need to extra-quote things.
     * @param {string} cwd - The working directory where the process should be run from
     * @param {Function} callback - callback( stdout: {string} ), called when done, and with the entire stdout output.
     * @param {Function} [errorOverrideCallback] - errorOverrideCallback( code: {number} ), called when errors with the
     *                                             exit code of the process.
     */
    execute: function( cmd, args, cwd, callback, errorOverrideCallback ) {
      var self = this;

      var process = child_process.spawn( cmd, args, {
        cwd: cwd
      } );
      grunt.log.debug( 'running ' + cmd + ' ' + args.join( ' ' ) + ' from ' + cwd );

      var stdoutData = ''; // to be appended to

      process.stderr.on( 'data', function( data ) {
        grunt.log.debug( 'stderr: ' + data );
      } );
      process.stdout.on( 'data', function( data ) {
        stdoutData += data;
        grunt.log.debug( 'stdout: ' + data );
      } );

      process.on( 'close', function( code ) {
        if ( code !== 0 ) {
          if ( errorOverrideCallback ) {
            errorOverrideCallback( code );
          }
          else {
            self.error( 'failed to execute ' + cmd + ' with error code ' + code );
          }
        }
        else {
          callback( stdoutData );
        }
      } );
    },

    /**
     * Requests an XML document from a URL, parses it with xml2js, and passes the result to the callback.
     * @private
     *
     * @param {string} url
     * @param {Function} callback - callback( xmlResult: Object ), see xml2js for more details
     */
    requestXML: function( url, callback ) {
      var self = this;
      grunt.log.debug( 'requesting ' + url );
      request( url, function( requestError, requestResponse, requestBody ) {
        self.assert( !requestError && requestResponse.statusCode === 200,
          'xml request failed with: ' + requestError );

        grunt.log.debug( 'parsing XML response' );
        xml2js.parseString( requestBody, function( xmlError, xmlResult ) {
          self.assert( !xmlError, 'xml parsing failed with: ' + xmlError );

          callback( xmlResult );
        } );
      } );
    },

    /**
     * Makes a metadata request to the main server for a simulation, and returns version information in the format:
     * { major: {number}, minor: {number}, maintenance: {number}, string: {string} }.
     * @private
     *
     * @param {string} simName - E.g. acid-base-solutions
     * @param {Function} callback - callback( versionInfo ).
     */
    getLatestProductionVersion: function( simName, callback ) {
      var self = this;

      // TODO: hook up with the JSON API preferably? This is using the old metadata-based API
      var url = 'http://phet.colorado.edu/services/metadata/simulation?simulation=' +
                encodeURIComponent( simName ) + '&format=phet-master';

      this.requestXML( url, function( xmlResult ) {
        self.assert( xmlResult.simulation, 'getLatestProductionVersion couldn\'t find sim: ' + simName );
        self.assert( xmlResult.simulation.technology[ 0 ].$.type === '2',
          'getLatestProductionVersion had non-HTML sim: ' + simName );

        var versionObject = xmlResult.simulation.version[ 0 ].$;
        var major = parseInt( versionObject.major, 10 );
        var minor = parseInt( versionObject.minor, 10 );
        var maintenance = parseInt( versionObject.dev, 10 );
        var versionString = major + '.' + minor + '.' + maintenance;
        callback( {
          major: major,
          minor: minor,
          maintenance: maintenance,
          string: versionString
        } );
      } );
    },

    /**
     * Parses the current package.json in a sim's directory for version information, returning it in a similar format
     * to getLatestProductionVersion, with the addition of { modifierType: {string}, modifierVersion: {number} }.
     * @private
     *
     * E.g. "1.2.0" => {
     *   major: 1,
     *   minor: 2,
     *   maintenance: 0,
     *   modifierType: undefined,
     *   modifierVersion: undefined,
     *   string: "1.2.0"
     * }
     * and
     * "1.2.0-rc.3" => {
     *   major: 1,
     *   minor: 2,
     *   maintenance: 0,
     *   modifierType: "rc",
     *   modifierVersion: 3,
     *   string: "1.2.0-rc.3"
     * }
     *
     * @param {string} simName
     * @param {Function} callback - callback( versionInfo ) - See above specification.
     */
    getCheckedInVersion: function( simName, callback ) {
      var packageObject = JSON.parse( fs.readFileSync( '../' + simName + '/package.json', 'utf8' ) );
      var currentVersionString = packageObject.version;
      var match = currentVersionString.match( /(\d+)\.(\d+)\.(\d+)(-(rc|dev)\.(\d+))?/ );
      callback( {
        major: parseInt( match[ 1 ], 10 ),
        minor: parseInt( match[ 2 ], 10 ),
        maintenance: parseInt( match[ 3 ], 10 ),
        modifierType: match[ 5 ],
        modifierVersion: parseInt( match[ 6 ], 10 ),
        string: currentVersionString
      } );
    },

    /**
     * Convenience "check out SHA/branch for repo".
     * @private
     *
     * @param {string} repo
     * @param {string} target
     * @param {Function} callback - callback() executed when complete
     */
    gitCheckout: function( repo, target, callback ) {
      this.execute( 'git', [ 'checkout', target ], '../' + repo, callback );
    },

    /**
     * Convenience "pull repo".
     * @private
     *
     * @param {string} repo
     * @param {Function} callback - callback() executed when complete
     */
    gitPull: function( repo, callback ) {
      this.execute( 'git', [ 'pull' ], '../' + repo, callback );
    },

    /**
     * Convenience "push repo, specifying an origin branch".
     * @private
     *
     * @param {string} repo
     * @param {string} remoteBranch - The branch that is getting pushed to, e.g. 'master' or '1.0'
     * @param {Function} callback - callback() executed when complete
     */
    gitPush: function( repo, remoteBranch, callback ) {
      this.assert( remoteBranch, 'Ensure we have a remote branch to push to' );
      this.execute( 'git', [ 'push', '-u', 'origin', remoteBranch ], '../' + repo, callback );
    },

    /**
     * Checks out (and pulls) the target (SHA/branch) for a specific repo, and then checks out all other repos specified
     * in its dependencies.json (with those SHAs).
     * @private
     *
     * @param {string} repo
     * @param {string} target
     * @param {Function} callback - callback( checkedOutRepos: Array.<string> ) - called when completed successfully.
     */
    gitCheckoutShas: function( repo, target, callback ) {
      grunt.log.debug( 'gitCheckoutShas ' + repo + ' ' + target );
      var self = this;

      // track checked-out repositories, as it's helpful for future processes
      var checkedOutRepoNames = [ repo ];

      this.gitCheckout( repo, target, function() {
        self.gitPull( repo, function() {
          self.getDependencies( repo, function( dependencies ) {
            // Ignore the repo we just checked out, and the comment
            var repoNames = Object.keys( dependencies ).filter( function( key ) {
              return key !== 'comment' && key !== repo;
            } );

            // async loop until done
            function checkoutNext() {
              if ( repoNames.length ) {
                var dependencyRepoName = repoNames.shift();

                checkedOutRepoNames.push( dependencyRepoName );
                var sha = dependencies[ dependencyRepoName ].sha;
                self.assert( sha, 'Missing sha for ' + dependencyRepoName + ' in ' + repo );

                self.gitCheckout( dependencyRepoName, sha, function() {
                  checkoutNext();
                } );
              }
              else {
                callback( checkedOutRepoNames );
              }
            }

            checkoutNext();
          } );
        } );
      } );
    },

    // callback(), reverse of gitCheckoutShas
    gitCheckoutMaster: function( repo, callback ) {
      grunt.log.debug( 'gitCheckoutMaster ' + repo );
      var self = this;
      this.getDependencies( repo, function( dependencies ) {
        // exclude only the comment
        var repoNames = Object.keys( dependencies ).filter( function( key ) {
          return key !== 'comment';
        } );

        function checkoutNext() {
          if ( repoNames.length ) {
            var repoName = repoNames.shift();

            self.gitClean( repoName, function() {
              checkoutNext();
            } );
          }
          else {
            callback();
          }
        }

        checkoutNext();
      } );
    },

    gitClean: function( repo, callback ) {
      var self = this;
      // TODO: improve as needed
      this.gitCheckout( repo, 'master', function() {
        self.execute( 'git', [ 'status', '--porcelain' ], '../' + repo, function( output ) {
          if ( output.trim().length ) {
            self.error( 'unclean status for ' + repo );
          }
          else {
            callback();
          }
        } );
      } );
    },

    // callback( sha )
    getCurrentSHA: function( repo, callback ) {
      var self = this;
      this.execute( 'git', [ 'rev-parse', 'HEAD' ], '../' + repo, function( sha ) {
        sha = sha.trim();
        self.assert( sha.length === 40, 'Response does not look like a SHA' );

        callback( sha );
      } );
    },

    npmInstall: function( repo, callback ) {
      this.execute( 'npm', [ 'install' ], '../' + repo, function() {
        callback();
      } );
    },

    getDependencies: function( repo, callback ) {
      var self = this;
      fs.readFile( '../' + repo + '/dependencies.json', 'utf8', function( fileError, fileData ) {
        self.assert( !fileError, 'Error opening ' + repo + ' dependencies.json: ' + fileError );

        callback( JSON.parse( fileData ) );
      } );
    },

    set storageObject( maintenanceObject ) {
      return fs.writeFileSync( '.maintenance.json', JSON.stringify( maintenanceObject, null, 2 ) );
    },

    get storageObject() {
      return JSON.parse( fs.readFileSync( '.maintenance.json', 'utf8' ) );
    },

    maintenanceStart: function( simsString ) {
      var self = this;

      var maintenanceObject = {
        sims: {
          // will be filled in
        },

        patches: {

        }
      };

      var simNames = simsString.split( ',' );

      var versionSimNames = simNames.slice();
      function requestNextVersion() {
        if ( versionSimNames.length ) {
          var simName = versionSimNames.shift();
          self.getLatestProductionVersion( simName, function( version ) {
            console.log( simName + '/' + version.string );

            maintenanceObject.sims[ simName ] = {
              branch: version.major + '.' + version.minor,
              currentMajor: version.major,
              currentMinor: version.minor,
              currentMaintenance: version.maintenance,
              currentVersionString: version.string
            }
            requestNextVersion();
          } );
        }
        else {
          self.storageObject = maintenanceObject;
          self.success( '.maintenance.json written' );
        }
      }

      requestNextVersion();
    },

    maintenancePatchInfo: function( reposString ) {
      var self = this;

      var repoNames = reposString.split( ',' );
      var maintenanceObject = this.storageObject;

      maintenanceObject.patches[ reposString ] = {};

      var simDependenciesMap = {}; // simName => dependencies object

      var simNames = Object.keys( maintenanceObject.sims )

      var requestSimNames = simNames.slice();
      function requestNextDependencies() {
        if ( requestSimNames.length ) {
          var simName = requestSimNames.shift();
          var branch = maintenanceObject.sims[ simName ].branch;
          self.assert( branch, 'Bad branch detected for ' + simName );

          self.gitCheckout( simName, branch, function() {
            self.gitPull( simName, function() {
              self.getDependencies( simName, function( dependencies ) {
                simDependenciesMap[ simName ] = dependencies;
                console.log( simName + ' ' + repoNames.map( function( repoName ) {
                  return dependencies[ repoName ].sha;
                } ).join( ',' ) );

                self.gitClean( simName, function() {
                  requestNextDependencies();
                } );
              } );
            } );
          } );
        }
        else {
          processDependencies();
        }
      }

      function processDependencies() {
        var shaGroupMap = {};

        simNames.forEach( function( simName ) {
          var dependencies = simDependenciesMap[ simName ];
          var shaGroupKey = repoNames.map( function( repoName ) {
            return dependencies[ repoName ].sha;
          } ).join( ',' );

          if ( shaGroupMap[ shaGroupKey ] ) {
            shaGroupMap[ shaGroupKey ].simNames.push( simName );
          }
          else {
            shaGroupMap[ shaGroupKey ] = {
              simNames: [ simName ]
            };
            // repoNames.forEach( function( repoName ) {
            //   shaGroupMap[ shaGroupKey ][ repoName ] = dependencies[ repoName ].sha;
            // } );
          }
        } );

        console.log( '\n---------------------\nMap for ' + repoNames.join( ',' ) + '\n' );

        for ( var shaGroupKey in shaGroupMap ) {
          console.log( shaGroupKey );
          var groupSimNames = shaGroupMap[ shaGroupKey ].simNames;
          groupSimNames.forEach( function( simName ) {
            console.log( '  ' + simName );
          } );

          maintenanceObject.patches[ reposString ][ shaGroupKey ] = {
            simNames: groupSimNames,
            patched: false
          };
        }

        console.log( '' ); // extra line

        self.storageObject = maintenanceObject;
        self.success( 'Stored SHA groups in .maintenance.json' );
      }

      requestNextDependencies();
    },

    maintenancePatchCheckout: function( reposString, shasString, simName ) {
      var self = this;

      var repoNames = reposString.split( ',' );
      var shas = shasString.split( ',' );
      var maintenanceObject = this.storageObject;
      maintenanceObject.activeShaGroup = shasString;
      var patchInfo = maintenanceObject.patches[ reposString ][ shasString ];
      this.assert( patchInfo, 'Missing patch info for repos:' + reposString + ' and shas:' + shasString );
      simName = simName || patchInfo.simNames[ 0 ];
      this.assert( _.contains( patchInfo.simNames, simName ), 'Sim ' + simName + ' not from the patch?' );

      this.gitCheckoutShas( simName, maintenanceObject.sims[ simName ].branch, function( checkedOutRepos ) {
        self.storageObject = maintenanceObject;
        self.success( 'Checked out SHAs for ' + simName + ' for ' + reposString + ' and ' + shasString );
      } );
    },

    maintenancePatchApply: function( reposString, message ) {
      var self = this;

      var repoNames = reposString.split( ',' );
      var maintenanceObject = this.storageObject;
      var shaGroup = maintenanceObject.activeShaGroup;
      var simNames = maintenanceObject.patches[ reposString ][ shaGroup ].simNames;
      this.assert( simNames, 'Could not find simulations matching the patch' );
      var oldShas = shaGroup.split( ',' );
      var currentShas = [];

      // Grab current SHAs for the repos
      var processRepoNames = repoNames.slice();
      function processNextRepo() {
        if ( processRepoNames.length ) {
          var repoName = processRepoNames.shift();

          self.getCurrentSHA( repoName, function( sha ) {
            currentShas.push( sha );
            console.log( 'new SHA for ' + repoName + ': ' + sha );

            processNextRepo();
          } );
        }
        else {
          // next step
          processNextSim();
        }
      }

      var processSimNames = simNames.slice();
      function processNextSim() {
        if ( processSimNames.length ) {
          var simName = processSimNames.shift();
          var branch = maintenanceObject.sims[ simName ].branch;
          var commonBranch = simName + '-' + branch; // e.g. acid-base-solutions-1.0
          console.log( 'patching ' + commonBranch );

          self.gitCheckoutShas( simName, branch, function() {
            var repoIndex = 0;
            function nextCommonRepo() {
              if ( repoIndex < repoNames.length ) {
                var repoName = repoNames[ repoIndex ];
                var sha = currentShas[ repoIndex ];
                repoIndex++;
                self.execute( 'git', [ 'checkout', commonBranch ], '../' + repoName, function() {
                  // success checking out
                  self.gitPull( repoName, function() {
                    self.getCurrentSHA( repoName, function( currentSHA ) {
                      if ( currentSHA === sha ) {
                        console.log( 'no patch needed for ' + commonBranch );
                        // already up-to-date, let's back things up and move on to the next
                        self.gitCheckoutMaster( simName, function() {
                          processNextSim();
                        } );
                      }
                      else {
                        console.log( 'merging ' + sha + ' into ' + repoName + ' ' + commonBranch );
                        self.execute( 'git', [ 'merge', sha ], '../' + repoName, function() {
                          self.gitPush( repoName, commonBranch, function() {
                            nextCommonRepo();
                          } );
                        } );
                      }
                    } );
                  } );
                }, function() {
                  // failure checking out
                  self.gitCheckout( repoName, sha, function() {
                    self.execute( 'git', [ 'checkout', '-b', commonBranch ], '../' + repoName, function() {
                      self.gitPush( repoName, commonBranch, function() {
                        nextCommonRepo();
                      } );
                    } );
                  } );
                } );
              }
              else {
                updateDependenciesJSON();
              }
            }
            function updateDependenciesJSON() {
              grunt.log.debug( 'updating dependencies.json' );
              self.npmInstall( simName, function() {
                self.npmInstall( 'chipper', function() {
                  self.execute( 'grunt', [], '../' + simName, function() {
                    fs.readFile( '../' + simName + '/build/dependencies.json', 'utf8', function( fileError, fileData ) {
                      self.assert( !fileError, 'DependenciesJSON file error: ' + fileError );

                      fs.writeFile( '../' + simName + '/dependencies.json', fileData, function() {
                        self.execute( 'git', [ 'add', 'dependencies.json' ], '../' + simName, function() {
                          self.execute( 'git', [ 'commit', '-m', 'Bumping dependencies.json for ' + message ], '../' + simName, function() {
                            self.gitPush( simName, branch, function() {
                              self.gitCheckoutMaster( simName, function() {
                                processNextSim();
                              } );
                            } );
                          })
                        } );
                      } );
                    } );
                  } );
                } );
              } );
            }
            nextCommonRepo();
          } );
        }
        else {
          self.success( 'Applied patches to all sims, updated dependencies.json' );
        }
      }

      processNextRepo();
    },

    maintenanceDeployRC: function( simName, message ) {
      var self = this;

      var maintenanceObject = this.storageObject;
      var branch = maintenanceObject.sims[ simName ].branch;
      this.assert( branch, 'Did not detect branch for ' + simName );

      this.gitCheckoutShas( simName, branch, function() {
        self.getCheckedInVersion( simName, function( branchVersionInfo ) {
          var productionVersionInfo = maintenanceObject.sims[ simName ];
          self.assert( productionVersionInfo.currentMajor === branchVersionInfo.major, 'Major version mismatch' );
          self.assert( productionVersionInfo.currentMinor === branchVersionInfo.minor, 'Minor version mismatch' );

          var major = branchVersionInfo.major;
          var minor = branchVersionInfo.minor;
          var maintenance = Math.max( productionVersionInfo.currentMaintenance + 1, branchVersionInfo.maintenance );
          var rcModifier = 1;
          if ( maintenance === branchVersionInfo.maintenance && branchVersionInfo.modifierType === 'rc' ) {
            // If we already have RC versions, bump the RC version
            if ( branchVersionInfo.modifierType === 'rc' ) {
              rcModifier = branchVersionInfo.modifierVersion + 1;
            }
            // If it seems to be a production version already, bump maintenance version for safety
            else if ( !branchVersionInfo.modifierType ) {
              maintenance++;
            }
          }
          var newVersionString = major + '.' + minor + '.' + maintenance + '-rc.' + rcModifier;

          var packageObject = JSON.parse( fs.readFileSync( '../' + simName + '/package.json', 'utf8' ) );
          packageObject.version = newVersionString;
          fs.writeFileSync( '../' + simName + '/package.json', JSON.stringify( packageObject, null, 2 ) );

          self.execute( 'git', [ 'add', 'package.json' ], '../' + simName, function() {
            self.execute( 'git', [ 'commit', '-m', 'Bumping version to ' + newVersionString + ' for ' + message ], '../' + simName, function() {
              self.gitPush( simName, branch, function() {
                self.npmInstall( simName, function() {
                  self.npmInstall( 'chipper', function() {
                    self.execute( 'grunt', [], '../' + simName, function() {
                      // note, may need to enable ssh-agent? "exec ssh-agent bash"
                      self.execute( 'grunt', [ 'deploy-rc' ], '../' + simName, function() {
                        self.gitCheckoutMaster( simName, function() {
                          self.success( 'Deployed ' + simName + ' ' + newVersionString );
                        } );
                      } );
                    } );
                  } );
                } );
              } );
            })
          } );
        } );
      } );
    },

    maintenanceDeployProduction: function( simName, message ) {
      var self = this;

      var maintenanceObject = this.storageObject;
      var branch = maintenanceObject.sims[ simName ].branch;
      this.assert( branch, 'Did not detect branch for ' + simName );

      this.gitCheckoutShas( simName, branch, function() {
        self.getCheckedInVersion( simName, function( branchVersionInfo ) {
          var productionVersionInfo = maintenanceObject.sims[ simName ];
          self.assert( productionVersionInfo.currentMajor === branchVersionInfo.major, 'Major version mismatch' );
          self.assert( productionVersionInfo.currentMinor === branchVersionInfo.minor, 'Minor version mismatch' );
          self.assert( branchVersionInfo.modifierType === 'rc' );
          self.assert( branchVersionInfo.maintenance > productionVersionInfo.currentMaintenance );

          var major = branchVersionInfo.major;
          var minor = branchVersionInfo.minor;
          var maintenance = Math.max( productionVersionInfo.currentMaintenance + 1, branchVersionInfo.maintenance );
          var newVersionString = major + '.' + minor + '.' + maintenance;

          var packageObject = JSON.parse( fs.readFileSync( '../' + simName + '/package.json', 'utf8' ) );
          packageObject.version = newVersionString;
          fs.writeFileSync( '../' + simName + '/package.json', JSON.stringify( packageObject, null, 2 ) );

          self.execute( 'git', [ 'add', 'package.json' ], '../' + simName, function() {
            self.execute( 'git', [ 'commit', '-m', 'Bumping version to ' + newVersionString + ' for ' + message ], '../' + simName, function() {
              self.gitPush( simName, branch, function() {
                self.npmInstall( simName, function() {
                  self.execute( 'grunt', [], '../' + simName, function() {
                    // extra args can safely be added, except for ph-scale
                    var extraArgs = ( simName.indexOf( 'ph-scale' ) === 0 ) ? [] : [ '--locales=*' ];
                    // note, may need to enable ssh-agent? "exec ssh-agent bash"
                    self.execute( 'grunt', [ 'deploy-production' ].concat( extraArgs ), '../' + simName, function() {
                      self.gitCheckoutMaster( simName, function() {
                        self.success( 'Deployed ' + simName + ' ' + newVersionString );
                      } );
                    } );
                  } );
                } );
              } );
            })
          } );
        } );
      } );
    }
  };
};