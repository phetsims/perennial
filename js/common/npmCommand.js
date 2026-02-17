// Copyright 2017, University of Colorado Boulder

/**
 * The npm "command" based on the platform.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

// {string} - needs to be a slightly different command for Windows
module.exports = /^win/.test( process.platform ) ? 'npm.cmd' : 'npm';