// Copyright 2023-2026, University of Colorado Boulder

/**
 * Returns a list of repositories (that can be run) actively handled by tooling for PhET
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { getRepoList } from './getRepoList.js';

export const getActiveRunnables = (): string[] => getRepoList( 'active-runnables' );
