// Copyright 2024, University of Colorado Boulder

/**
 * Builds a decaf version of the simulation
 * --project : The name of the project to deploy
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import buildDecaf from '../decaf/buildDecaf.js';
import getOption from './util/getOption.js';

( async () => {
  const project = getOption( 'project' );
  assert( project, 'Requires specifying a repository with --project={{PROJECT}}' );
  await buildDecaf( project );
} )();