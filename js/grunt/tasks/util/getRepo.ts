// Copyright 2013-2024, University of Colorado Boulder

import assert from 'assert';
/**
 * @author Sam Reid (PhET Interactive Simulations)
 */
import grunt from 'grunt';
import process from 'process';
import getOption from './getOption';

const getRepo = (): string => {

  let repo = getOption( 'repo' );

  if ( !repo ) {

    try {
      const packageObject = grunt.file.readJSON( 'package.json' );
      repo = packageObject.name;
    }
    catch( e ) {
      assert( false, `Expected package.json for current working directory: ${process.cwd()}` );
    }
  }

  assert( typeof repo === 'string' && /^[a-z]+(-[a-z]+)*$/u.test( repo ), 'repo name should be composed of lower-case characters, optionally with dashes used as separators' );

  return repo;
};

export default getRepo;