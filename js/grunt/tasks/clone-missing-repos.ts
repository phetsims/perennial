// Copyright 2024, University of Colorado Boulder

/**
 * Clones any repos not currently checked out in the code base.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import cloneMissingRepos from '../../common/cloneMissingRepos.js';
import getOption from './util/getOption.js';

( async () => cloneMissingRepos( getOption( 'p' ) ) )();