// Copyright 2026, University of Colorado Boulder

/**
 * Detects whether we are running inside the totality monorepo. In the monorepo, perennial-alias/ is a subdirectory
 * (no .git of its own), whereas in the polyrepo layout it is a standalone git repo with its own .git.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

const fs = require( 'fs' );
const path = require( 'path' );

const perennialAliasRoot = path.resolve( __dirname, '..', '..' );
const isTotality = !fs.existsSync( path.join( perennialAliasRoot, '.git' ) );

module.exports = isTotality;