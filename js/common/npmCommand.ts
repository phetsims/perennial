// Copyright 2017-2026, University of Colorado Boulder

/**
 * The npm "command" based on the platform.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

// needs to be a slightly different command for Windows
export const npmCommand = process.platform.startsWith( 'win' ) ? 'npm.cmd' : 'npm';