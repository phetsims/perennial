// Copyright 2024-2026, University of Colorado Boulder

/**
 * Creates a sim based on the simula-rasa template.
 * --sim="string" : the sim name
 * --author="string" : the author name
 * --title="string" : (optional) the simulation title
 * --clean=true : (optional) deletes the sim directory if it exists
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
import assert from 'assert';
import { assertIsValidDependencyName } from '../../common/assertIsValidDependencyName.js';
import { createSim } from '../../common/createSim.js';
import getOption from './util/getOption.js';

( async () => {

    const sim = getOption( 'sim' );

    const author = getOption( 'author' );
    const title = getOption( 'title' );
    const clean = getOption( 'clean' );

    assert( sim, 'Requires specifying a sim name with --sim={{REPO}}' );
    assert( getOption( 'author' ), 'Requires specifying a author with --author={{AUTHOR}}' );

    assertIsValidDependencyName( sim );
    await createSim( sim, author, { title: title, clean: clean } );
} )();