// Copyright 2002-2015, University of Colorado Boulder

/**
 * Grunt configuration file for tasks that have no dependencies on other repos.
 * In particular, grunt checkout-shas and grunt checkout-master can be run from here
 * without worrying about an older version of chipper being checked out.
 */

// grunt tasks
var checkoutShas = require( '../../../perennial/js/grunt/checkoutShas' );
var checkoutMasterAll = require( '../../../perennial/js/grunt/checkoutMasterAll' );
var maintenance = require( '../../../perennial/js/grunt/maintenance' );

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

  grunt.registerTask( 'checkout-master-all',
    'Check out master branch for all repos in git root',
    function() {
      checkoutMasterAll( grunt );
    } );

  grunt.registerTask( 'maintenance-start',
    'TODO docs\n' +
    '--sims : A comma-separated list of simulations that may be involved in this maintenance release process',
    function() {
      maintenance( grunt, this.async() ).maintenanceStart( grunt.option( 'sims' ) );
    } );

  grunt.registerTask( 'maintenance-patch-info',
    'TODO docs\n' +
    '--repos : A comma-separated list of repo names that need a combined patch',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchInfo( grunt.option( 'repos' ) );
    } );

  grunt.registerTask( 'maintenance-patch-checkout',
    'TODO docs\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--shas : A comma-separated list of SHAs for the respective repos that need a combined patch\n' +
    '--sim : [optional] preferred sim to test with',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchCheckout( grunt.option( 'repos' ), grunt.option( 'shas' ), grunt.option( 'sim' ) );
    } );

  grunt.registerTask( 'maintenance-patch-apply',
    'TODO docs\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--message : Commit message for dependencies.json bumps',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchApply( grunt.option( 'repos' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-rc',
    'TODO docs\n' +
    '--sim : A sim name\n' +
    '--message : Commit message for dependencies.json bumps',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployRC( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-production',
    'TODO docs\n' +
    '--sim : A sim name\n' +
    '--message : Commit message for dependencies.json bumps',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployProduction( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );
};
