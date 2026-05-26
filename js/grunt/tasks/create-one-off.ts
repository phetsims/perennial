// Copyright 2024, University of Colorado Boulder

/**
 * Creates a new release branch for a given simulation
 * --sim : The repository to add the release branch to
 * --name : The branch/one-off name, which should be anything without dashes or periods
 * --message : An optional message that will be appended on version-change commits.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { assertIsValidDependencyName } from '../../common/assertIsValidDependencyName.js';
import getOption from './util/getOption.js';
import { Checkout } from '../../common/Checkout.js';

( async () => {

  const sim = getOption( 'sim' );
  const name = getOption( 'name' );
  const message = getOption( 'message' );

  assert( sim, 'Requires specifying a repository with --sim={{SIM}}' );
  assert( name, 'Requires specifying a name with --name={{NAME}}' );
  assert( !name.includes( '-' ) && !name.includes( '.' ), 'Branch should not contain dashes or periods' );
  assertIsValidDependencyName( sim );

  await Checkout.createOneOffCheckout( sim, name, message );
} )();