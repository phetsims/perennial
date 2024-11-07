// Copyright 2024, University of Colorado Boulder

/**
 * If there is a TO-DO in the project pointing to a closed issue, reopen it.
 * TODO: Should be moved to perennial/js/scripts/ and inline module. https://github.com/phetsims/perennial/issues/370
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import reopenIssuesFromTODOs from '../reopenIssuesFromTODOs.js';

( async () => reopenIssuesFromTODOs() )();