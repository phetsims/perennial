// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'production',
  'Marks a simulation as published, and deploys a production version of the simulation\n' +
  '--repo : The name of the repository to deploy\n' +
  '--branch : The release branch name (e.g. "1.7") that should be used for deployment\n' +
  '--brands : A comma-separated list of brand names to deploy\n' +
  '--noninteractive : If specified, prompts will be skipped. Some prompts that should not be automated will fail out\n' +
  '--redeploy: If specified with noninteractive, allow the production deploy to have the same version as the previous deploy\n' +
  '--message : An optional message that will be appended on version-change commits.',
  wrapTask( async () => {
    import production from '../production';
    import markSimAsPublished from '../../common/markSimAsPublished';

    assert( getOption( 'repo' ), 'Requires specifying a repository with --repo={{REPOSITORY}}' );
    assert( getOption( 'branch' ), 'Requires specifying a branch with --branch={{BRANCH}}' );
    assert( getOption( 'brands' ), 'Requires specifying brands (comma-separated) with --brands={{BRANDS}}' );

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    await markSimAsPublished( repo );

    await production( repo, getOption( 'branch' ), getOption( 'brands' ).split( ',' ), noninteractive,
      getOption( 'redeploy' ), getOption( 'message' ) );
  } ) );