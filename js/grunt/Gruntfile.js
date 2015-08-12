// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-master can be run from here
 * without worrying about an older version of chipper being checked out.
 */

// grunt tasks
var checkoutShas = require( '../../../perennial/js/grunt/checkoutShas' );

module.exports = function( grunt ) {
  'use strict';

  grunt.registerTask( 'checkout-shas',
    'Check out shas for a project, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from',
    function() {
      var buildServer = grunt.option( 'buildServer' ) ? true : false;
      checkoutShas( grunt, grunt.option( 'repo' ), false, buildServer );
    } );

  grunt.registerTask( 'checkout-master',
    'Check out master branch for all dependencies, as specified in dependencies.json\n' +
    '--repo : repository name where package.json should be read from',
    function() {
      checkoutShas( grunt, grunt.option( 'repo' ), true );
    } );
};
