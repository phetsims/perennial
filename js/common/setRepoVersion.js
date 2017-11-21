// Copyright 2017, University of Colorado Boulder

/**
 * Sets the version of the current checked-in repo's package.json, creating a commit with the change
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
var fs = require( 'fs' );
var gitAdd = require( './gitAdd' );
var gitCommit = require( './gitCommit' );
var gitIsClean = require( './gitIsClean' );
var winston = require( 'winston' );

/**
 * Sets the version for a current checked-in repo, creating a commit with the change
 * @public
 *
 * @param {string} repo - The repository name
 * @param {SimVersion} version
 * @param {Function} callback - callback()
 * @param {Function} [errorCallback] - errorCallback( message: {string} )
 */
module.exports = function( repo, version, callback, errorCallback ) {
  winston.info( 'Setting version from package.json for ' + repo + ' to ' + version.toString() );

  var packageFile = '../' + repo + '/package.json';

  gitIsClean( repo, function( isClean ) {
    if ( !isClean ) {
      winston.error( 'Unclean status in ' + repo + ', cannot increment version' );
      if ( errorCallback ) {
        errorCallback( 'Unclean status in ' + repo + ', cannot increment version' );
        return;
      }
      else {
        throw new Error( 'Unclean status in ' + repo + ', cannot increment version' );
      }
    }

    fs.readFile( packageFile, 'utf8', function( err, data ) {
      if ( err ) {
        winston.error( 'Error occurred reading package.json: ' + err );
        if ( errorCallback ) {
          errorCallback( err );
          return;
        }
        else {
          throw err;
        }
      }

      var packageObject = JSON.parse( data );
      packageObject.version = version.toString();

      fs.writeFile( packageFile, JSON.stringify( packageObject, null, 2 ), function( err ) {
        if ( err ) {
          winston.error( 'Error occurred writing to package.json: ' + err );
          if ( errorCallback ) {
            errorCallback( err );
            return;
          }
          else {
            throw err;
          }
        }
        else {
          gitAdd( repo, 'package.json', function() {
            gitCommit( repo, 'Bumping version to ' + version.toString(), function() {
              callback();
            }, errorCallback );
          }, errorCallback );
        }
      } );
    } );
  }, errorCallback );
};
