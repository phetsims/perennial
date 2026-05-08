// Copyright 2017-2026, University of Colorado Boulder

/**
 * Returns a list of scenerystack repositories actively handled by tooling for PhET
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getRepoList } from './getRepoList.js';

export const getActiveRepos = (): string[] => getRepoList( 'active-scenerystack-repos' );
