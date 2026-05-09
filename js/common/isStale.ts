// Copyright 2020-2026, University of Colorado Boulder

/**
 * Asynchronously checks whether a repo is not up-to-date with origin/main
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getBranchSHAMap } from './getBranchSHAMap.js';
import { gitRevParse } from './gitRevParse.js';

export const isStale = async (): Promise<boolean> => {
  const currentSHA = await gitRevParse( 'main' );
  // NOTE: This is likely not the most performant way to do this
  const remoteSHA = ( await getBranchSHAMap() ).main;

  return currentSHA !== remoteSHA;
};