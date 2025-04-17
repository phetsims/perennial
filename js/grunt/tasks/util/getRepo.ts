// Copyright 2013-2024, University of Colorado Boulder

/**
 * Get the repo by processing from multiple locations (command line options and package).
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import path from 'path';
import process from 'process';
import affirm from '../../../browser-and-node/affirm.js';
import { Repo } from '../../../browser-and-node/PerennialTypes.js';
import dirname from '../../../common/dirname.js';
import getOption from './getOption.js';

// @ts-expect-error - until we have "type": "module" in our package.json
const __dirname = dirname( import.meta.url );

const gitRoot = path.resolve( `${__dirname}/../../../../../` );

export default function getRepo(): Repo {

  const repoOption = getOption( 'repo' );
  if ( repoOption ) {
    return repoOption;
  }
  else {
    const relative = path.relative( gitRoot, process.cwd() );
    affirm( relative !== '' && !relative.startsWith( '..' ), `cannot find repo name, expected cwd to be inside of git root. gitRoot: ${gitRoot}, cwd: ${process.cwd()}` );
    const term = relative.split( path.sep )[ 0 ]; // the first term from the relative path
    return term;
  }
}