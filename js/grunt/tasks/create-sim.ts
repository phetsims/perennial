// Copyright 2024, University of Colorado Boulder

/**
 *  'Creates a sim based on the simula-rasa template.\n' +
 *   '--repo="string" : the repository name\n' +
 *   '--author="string" : the author name\n' +
 *   '--title="string" : (optional) the simulation title\n' +
 *   '--clean=true : (optional) deletes the repository directory if it exists',
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName';
import createSim from '../createSim';
import getOption from './util/getOption';

( async () => {

    const repo = getOption( 'repo' );
    assertIsValidRepoName( repo );

    const author = getOption( 'author' );
    const title = getOption( 'title' );
    const clean = getOption( 'clean' );

    assert( repo, 'Requires specifying a repository name with --repo={{REPO}}' );
    assert( getOption( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

    await createSim( repo, author, { title: title, clean: clean } );
} )();