// Copyright 2024, University of Colorado Boulder
import assert from 'assert';

grunt.registerTask( 'create-sim',
  'Creates a sim based on the simula-rasa template.\n' +
  '--repo="string" : the repository name\n' +
  '--author="string" : the author name\n' +
  '--title="string" : (optional) the simulation title\n' +
  '--clean=true : (optional) deletes the repository directory if it exists',
  wrapTask( async () => {
    import createSim from '../createSim';

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    const author = getOption( 'author' );
    const title = getOption( 'title' );
    const clean = getOption( 'clean' );

    assert( repo, 'Requires specifying a repository name with --repo={{REPO}}' );
    assert( getOption( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

    await createSim( repo, author, { title: title, clean: clean } );
  } ) );