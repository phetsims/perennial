// Copyright 2024, University of Colorado Boulder

/**
 * Collection of helper content for using perennial
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import path from 'path';
import dirname from './dirname.js';

// @ts-expect-error - until we have "type": "module" in our package.json
const __dirname = dirname( import.meta.url );

const PERENNIAL_ROOT_PATH = `${__dirname}/../..`;
export const PERENNIAL_ROOT = path.resolve( PERENNIAL_ROOT_PATH );
export const PERENNIAL_REPO_NAME = PERENNIAL_ROOT.split( /[\\/]/ ).pop()!;