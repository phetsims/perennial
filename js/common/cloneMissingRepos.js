// Copyright 2020, University of Colorado Boulder

/**
 * Clones missing repositories
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

'use strict';

const execute = require( './execute' );
const winston = require( 'winston' );

/**
 * Clones missing repositories
 * @public
 *
 * @returns {Promise} - Resolves with no value
 */
module.exports = async () => {
  winston.info( 'Cloning missing repos' );

  return execute( 'bash', [ 'perennial/bin/clone-missing-repos.sh' ], '../' );
};
