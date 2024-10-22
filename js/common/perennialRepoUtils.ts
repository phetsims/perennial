// Copyright 2024, University of Colorado Boulder

import path from 'path';

/**
 * Collection of helper content for using perennial
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
const PERENNIAL_ROOT_PATH = `${__dirname}/../..`;
export const PERENNIAL_ROOT = path.resolve( PERENNIAL_ROOT_PATH );
export const PERENNIAL_REPO_NAME = PERENNIAL_ROOT.split( /[\\/]/ ).pop();