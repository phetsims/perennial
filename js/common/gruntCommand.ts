// Copyright 2017-2026, University of Colorado Boulder

/**
 * The grunt "command" based on the platform.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

// needs to be a slightly different command for Windows
export const gruntCommand = /^win/.test( process.platform ) ? 'grunt.cmd' : 'grunt';