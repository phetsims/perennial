// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'deploy-decaf',
  'Deploys a decaf version of the simulation\n' +
  '--project : The name of the project to deploy',
  wrapTask( async () => {
    import deployDecaf from '../decaf/deployDecaf';

    assert( getOption( 'project' ), 'Requires specifying a repository with --project={{PROJECT}}' );
    assert( getOption( 'dev' ) || getOption( 'production' ), 'Requires at least one of --dev or --production' );
    await deployDecaf( getOption( 'project' ), !!getOption( 'dev' ), !!getOption( 'production' ) );
  } ) );