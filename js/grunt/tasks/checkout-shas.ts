// Copyright 2024, University of Colorado Boulder

/**
 * Check out shas for a project, as specified in dependencies.json
 * --repo : repository name where package.json should be read from
 * --skipNpmUpdate : If provided, will prevent the usual npm update
 * --buildServer : If provided, it will read dependencies from the build-server temporary location (and will skip npm update)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import grunt from 'grunt';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import checkoutDependencies from '../../common/checkoutDependencies';
import getOption from './util/getOption';

( async () => {
  assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );

  const buildServer = !!getOption( 'buildServer' );

  const repo = getOption( 'repo' );
  assertIsValidRepoName( repo );

  const dependencies = grunt.file.readJSON( buildServer ? '../perennial/js/build-server/tmp/dependencies.json' : `../${repo}/dependencies.json` );
  const includeNpmUpdate = !getOption( 'skipNpmUpdate' ) && !buildServer;

  await checkoutDependencies( repo, dependencies, includeNpmUpdate );
} )();