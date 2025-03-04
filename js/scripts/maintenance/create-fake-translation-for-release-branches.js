// Copyright 2024, University of Colorado Boulder

/**
 * For testing for https://github.com/phetsims/joist/issues/963.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const Maintenance = require( '../../common/Maintenance' ).default;
const winston = require( 'winston' );
const fs = require( 'fs' );

winston.default.transports.console.level = 'error';

const testLocale = 'pu'; // Palauan, `pau`

( async () => {
  for ( const releaseBranch of await Maintenance.loadAllMaintenanceBranches() ) {
    const esTranslationFile = `../release-branches/${releaseBranch.repo}-${releaseBranch.branch}/babel/${releaseBranch.repo}/${releaseBranch.repo}-strings_es.json`;
    const testTranslationFile = `../release-branches/${releaseBranch.repo}-${releaseBranch.branch}/babel/${releaseBranch.repo}/${releaseBranch.repo}-strings_${testLocale}.json`;

    console.log( 'in:', esTranslationFile );
    console.log( 'out:', testTranslationFile );
    fs.copyFileSync( esTranslationFile, testTranslationFile );
  }
} )();