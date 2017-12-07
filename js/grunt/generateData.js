// Copyright 2017, University of Colorado Boulder

/**
 * Generates the lists under perennial/data/.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const assert = require( 'assert' );
const fs = require( 'fs' );
const getActiveRepos = require( '../common/getActiveRepos' );
const grunt = require( 'grunt' );
const os = require( 'os' );

/**
 * Generates the lists under perennial/data/.
 * @public
 */
module.exports = function() {
  const activeRepos = getActiveRepos();

  function writeList( name, packageFilter ) {
    const repos = activeRepos.filter( repo => {
      // Make sure that if someone doesn't have all repositories checked out that this will FAIL. Otherwise bad things.
      assert( grunt.file.exists( `../${repo}` ) );
      
      var packageObject;
      try {
        packageObject = JSON.parse( fs.readFileSync( `../${repo}/package.json`, 'utf8' ) );
      }
      catch ( e ) {
        return false;
      }
      return packageObject.phet && packageFilter( packageObject.phet );
    } );

    grunt.log.writeln( `Writing to data/${name}` );
    fs.writeFileSync( `data/${name}`, repos.join( os.EOL ) + os.EOL );
  }

  writeList( 'accessibility', phet => phet.accessible );
  writeList( 'active-runnables', phet => phet.runnable );
  writeList( 'active-sims', phet => phet.simulation );
  writeList( 'phet-io', phet => phet.supportedBrands && phet.supportedBrands.includes( 'phet-io' ) );
  writeList( 'testable-runnables', phet => phet.runnable && phet.automatedTestEnabled !== false );
  writeList( 'testable-phet-io', phet => phet.supportedBrands && phet.supportedBrands.includes( 'phet-io' ) && phet.automatedTestEnabled !== false );
};
