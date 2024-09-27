// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'npm-update',
  'Runs npm update/prune for chipper, perennial-alias and the given repository\n' +
  '--repo : The repository to update',
  wrapTask( async () => {
    import npmUpdate from '../../common/npmUpdate';

    const repo = getOption( 'repo' );
    assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );

    assertIsValidRepoName( repo );

    await npmUpdate( repo ).then( () => npmUpdate( 'chipper' ) ).then( () => npmUpdate( 'perennial-alias' ) );
  } ) );
