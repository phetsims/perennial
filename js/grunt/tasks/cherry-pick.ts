// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'cherry-pick',
  'Runs cherry-pick on a list of SHAs until one works. Reports success or failure\n' +
  '--repo : The repository to cherry-pick on\n' +
  '--shas : Comma-separated list of SHAs to try',
  wrapTask( async () => {
    import cherryPick from '../cherryPick';

    const repo = getOption( 'repo' );

    assert( repo, 'Requires specifying a repository with --repo={{REPOSITORY}}' );
    assert( getOption( 'shas' ), 'Requires specifying a comma-separated list of SHAs with --shas={{SHAS}}' );

    assertIsValidRepoName( repo );

    const shas = getOption( 'shas' ).split( ',' );

    await cherryPick( repo, shas );
  } ) );
