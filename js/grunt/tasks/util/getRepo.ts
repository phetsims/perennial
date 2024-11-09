// Copyright 2013-2024, University of Colorado Boulder

import assert from 'assert';
import path from 'path';
import process from 'process';
import { Repo } from '../../../common/PerennialTypes.js';
import getOption from './getOption.js';
import { readFileSync } from 'fs';

/**
 * Get the repo by processing from multiple locations (command line options and package).
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default function getRepo(): Repo {

  let repo = getOption( 'repo' );

  if ( !repo ) {

    try {
      const packageObject = JSON.parse( readFileSync( 'package.json', 'utf8' ) );
      repo = packageObject.name;

      // Support checking in "perennial-alias" if running from that repo
      if ( repo === 'perennial' ) {
        repo = path.parse( path.resolve( `${__dirname}/../../../../` ) ).name;
        assert( repo.startsWith( 'perennial' ), `unexpected repo name in perennial: ${repo}` );
      }
    }
    catch( e ) {
      assert( false, `Expected package.json for current working directory: ${process.cwd()}` );
    }
  }

  assert( typeof repo === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( repo ), `repo name should be composed of lower-case characters, optionally with dashes used as separators: ${repo}` );

  return repo;
}