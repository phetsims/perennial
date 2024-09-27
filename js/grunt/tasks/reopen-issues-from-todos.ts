// Copyright 2024, University of Colorado Boulder

/**
 * If there is a TODO in the project pointing to a closed issue, reopen it.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import reopenIssuesFromTODOs from '../reopenIssuesFromTODOs';

( async () => {
  await reopenIssuesFromTODOs();
} )();