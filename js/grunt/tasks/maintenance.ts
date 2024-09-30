// Copyright 2024, University of Colorado Boulder

/**
 * Starts a maintenance REPL
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
// TODO: Do these maintenance entry points belong in grunt? See https://github.com/phetsims/chipper/issues/1461

import Maintenance from '../../common/Maintenance';

( async () => Maintenance.startREPL() )();