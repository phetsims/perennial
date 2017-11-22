// Copyright 2017, University of Colorado Boulder

/**
 * For `grunt cherry-pick`, see Gruntfile for details
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const gitCherryPick = require( '../common/gitCherryPick' );

/**
 * For `grunt cherry-pick`, see Gruntfile for details
 * @public
 *
 * @param {string} repo - The repository name
 * @param {Array.<string>} shas
 * @returns {Promise}
 */
module.exports = async function( grunt, repo, shas ) {
  for ( var i = 0; i < shas.length; i++ ) {
    const sha = shas[ i ];

    var success;
    try {
      success = await gitCherryPick( repo, sha );
    }
    catch ( e ) {
      grunt.log.error( 'abort failed :' + JSON.stringify( e ) );
      return;
    }

    if ( success ) {
      grunt.log.ok( 'Cherry-pick with ' + sha + ' was successful' );
      return;
    }
  }

  grunt.log.error( 'No SHAs were able to be cherry-picked without conflicts' );
};
