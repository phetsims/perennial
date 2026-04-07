// Copyright 2024-2026, University of Colorado Boulder

/**
 * Starts a maintenance REPL
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import Maintenance from '../../common/Maintenance.js';

console.log( 'Starting maintenance REPL...' );
console.log( 'NOTE: We would like to work on the following issues in coordination with the next maintenance release:\n* https://github.com/phetsims/perennial/issues/460\n*' );

( async () => Maintenance.startREPL() )();