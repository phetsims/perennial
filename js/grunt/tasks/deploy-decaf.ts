// Copyright 2024, University of Colorado Boulder

/**
 *   'Deploys a decaf version of the simulation\n' +
 *   '--project : The name of the project to deploy',
 *   @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import deployDecaf from '../decaf/deployDecaf';
import getOption from './util/getOption';

( async () => {

  assert( getOption( 'project' ), 'Requires specifying a repository with --project={{PROJECT}}' );
  assert( getOption( 'dev' ) || getOption( 'production' ), 'Requires at least one of --dev or --production' );
  await deployDecaf( getOption( 'project' ), !!getOption( 'dev' ), !!getOption( 'production' ) );
} )();