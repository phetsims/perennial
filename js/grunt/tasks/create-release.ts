// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'create-release',
  'Creates a new release branch for a given simulation\n' +
  '--repo : The repository to add the release branch to\n' +
  '--branch : The branch name, which should be {{MAJOR}}.{{MINOR}}, e.g. 1.0\n' +
  '--brands : The supported brands for the release, comma separated.\n' +
  '--message : An optional message that will be appended on version-change commits.',
  wrapTask( async () => {
    import createRelease from '../createRelease';

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    const branch = getOption( 'branch' );
    const message = getOption( 'message' );
    const brands = getOption( 'brands' );

    assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
    assert( brands, 'Requires specifying brands with --brands={{BRANDS}} (comma separated)' );
    assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
    assert( branch.split( '.' ).length === 2, 'Branch should be {{MAJOR}}.{{MINOR}}' );

    await createRelease( repo, branch, brands.split( ',' ), message );
  } ) );