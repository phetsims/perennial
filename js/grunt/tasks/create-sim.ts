// Copyright 2024, University of Colorado Boulder

/**
 * Creates a sim based on the simula-rasa template.
 * --repo="string" : the repository name
 * --author="string" : the author name
 * --title="string" : (optional) the simulation title
 * --clean=true : (optional) deletes the repository directory if it exists
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import assertIsValidRepoName from '../../common/assertIsValidRepoName.js';
import createSim from '../createSim.js';
import getOption from './util/getOption.js';

( async () => {

    const repo = getOption( 'repo' );

    const author = getOption( 'author' );
    const title = getOption( 'title' );
    const clean = getOption( 'clean' );

    assert( repo, 'Requires specifying a repository name with --repo={{REPO}}' );
    assert( getOption( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

    assertIsValidRepoName( repo );
    await createSim( repo, author, { title: title, clean: clean } );
} )();