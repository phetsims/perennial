// Copyright 2021-2026, University of Colorado Boulder

/**
 * Whether the current branch's remote SHA differs from the current SHA
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getBranchSHAMap } from './getBranchSHAMap.js';
import { gitRevParse } from './gitRevParse.js';
import { getBranch } from './getBranch.js';

export const isGitRemoteDifferent = async () => {
  const branch = await getBranch();
  const currentSHA = await gitRevParse( 'HEAD' );
  const remoteSHA = ( await getBranchSHAMap() )[ branch ];

  return currentSHA !== remoteSHA;
};
