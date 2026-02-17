// Copyright 2025, University of Colorado Boulder

/**
 * The npx "command" based on the platform.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// {string} - needs to be a slightly different command for Windows
export const npxCommand = process.platform.startsWith( 'win' ) ? 'npx.cmd' : 'npx';