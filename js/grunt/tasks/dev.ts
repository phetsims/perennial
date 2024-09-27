// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'dev',
  'Deploys a dev version of the simulation\n' +
  '--repo : The name of the repository to deploy\n' +
  '--brands : A comma-separated list of brand names to deploy\n' +
  '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
  '--message : An optional message that will be appended on version-change commits.',
  wrapTask( async () => {
    import dev from '../dev';
    assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
    assert( getOption( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    await dev( repo, getOption( 'brands' ).split( ',' ), noninteractive, 'main', getOption( 'message' ) );
  } ) );
