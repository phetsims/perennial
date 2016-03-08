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
    'Starts the maintenance-release process.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sims : A comma-separated list of simulations that may be involved in this maintenance release process',
    function() {
      maintenance( grunt, this.async() ).maintenanceStart( grunt.option( 'sims' ) );
    } );

  grunt.registerTask( 'maintenance-patch-info',
    'Stores and prints out information about what SHAs of the repositories all of the simulations use.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchInfo( grunt.option( 'repos' ) );
    } );

  grunt.registerTask( 'maintenance-patch-checkout',
    'Checks out SHAs for modification and testing.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--shas : A comma-separated list of SHAs for the respective repos that need a combined patch\n' +
    '--sim : [optional] preferred sim to test with',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchCheckout( grunt.option( 'repos' ), grunt.option( 'shas' ), grunt.option( 'sim' ) );
    } );

  grunt.registerTask( 'maintenance-patch-apply',
    'Applies committed changes to common repos\' sim-specific branches, and updates dependencies.json for affected\n' +
    'sim repos\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--repos : A comma-separated list of repo names that need a combined patch\n' +
    '--message : Additional part of message for the dependencies.json commit',
    function() {
      maintenance( grunt, this.async() ).maintenancePatchApply( grunt.option( 'repos' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-rc',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch, bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployRC( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-rc-no-version-bump',
    'Deploys an RC (release candidate) for the simulation from the maintenance branch without bumping versions.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployRCNoVersionBump( grunt.option( 'sim' ) );
    } );

  grunt.registerTask( 'maintenance-deploy-production',
    'Deploys the simulation maintenance release to production, bumping the version number.\n' +
    'See https://github.com/phetsims/phet-info/blob/master/maintenance-release-process.md for details.\n' +
    '--sim : Sim name\n' +
    '--message : Additional part of message for the version bump commit',
    function() {
      maintenance( grunt, this.async() ).maintenanceDeployProduction( grunt.option( 'sim' ), grunt.option( 'message' ) );
    } );
};
