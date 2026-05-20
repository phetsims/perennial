// Copyright 2020-2026, University of Colorado Boulder

/**
 * Returns a list of repositories based on data in perennial/data.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import fs from 'fs';
import { Repo } from '../../browser-and-node/PerennialTypes.js';

/**
 * Returns a list of repositories based on data in perennial/data.
 *
 * @param name - The name of the list
 */
export const getRepoList = ( name: string ): Repo[] => {
  const contents = fs.readFileSync( `${__dirname}/../../data/${name}`, 'utf8' ).trim();

  // Trim will remove any spaces and carriage returns if they are present.
  return contents.split( '\n' ).map( sim => sim.trim() );
};
