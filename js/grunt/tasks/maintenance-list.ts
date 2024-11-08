// Copyright 2024, University of Colorado Boulder

/**
 * Lists out the current maintenance process state
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import Maintenance from '../../common/Maintenance.js';

// TODO: Does this belong in grunt? See https://github.com/phetsims/chipper/issues/1461
( async () => Maintenance.list() )();