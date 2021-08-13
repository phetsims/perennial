// Copyright 2021, University of Colorado Boulder

/**
 * Protect release branches, and master and main from being deleted
 * for all active repositories.
 *
 * TODO: Do not use yet.
 *
 * TODO: Still a work in progress, see https://github.com/phetsims/special-ops/issues/197
 */

const githubProtectBranches = require( '../common/githubProtectBranches' );

// TODO: just for testing, presumably replace with active-repos
const reposToProtect = [ 'john-travoltage', 'balloons-and-static-electricity' ];

githubProtectBranches( reposToProtect );