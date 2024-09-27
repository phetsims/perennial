// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'create-one-off',
  'Creates a new release branch for a given simulation\n' +
  '--repo : The repository to add the release branch to\n' +
  '--branch : The branch/one-off name, which should be anything without dashes or periods\n' +
  '--message : An optional message that will be appended on version-change commits.',
  wrapTask( async () => {
    import createOneOff from '../createOneOff';

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    const branch = getOption( 'branch' );
    const message = getOption( 'message' );
    assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
    assert( branch, 'Requires specifying a branch with --branch={{BRANCH}}' );
    assert( !branch.includes( '-' ) && !branch.includes( '.' ), 'Branch should not contain dashes or periods' );

    await createOneOff( repo, branch, message );
  } ) );