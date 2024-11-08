// Copyright 2024, University of Colorado Boulder

/**
 * Clones any repos not currently checked out in the code base.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 *
 * TODO: ASK DEVS: Delete this grunt task, SR MK think it doesn't belong in formal API (it should just be part of a full thing), https://github.com/phetsims/chipper/issues/1461
 */

import cloneMissingRepos from '../../common/cloneMissingRepos.js';

( async () => cloneMissingRepos() )();