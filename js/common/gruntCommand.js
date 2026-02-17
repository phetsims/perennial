// Copyright 2017, University of Colorado Boulder

/**
 * The grunt "command" based on the platform.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

// {string} - needs to be a slightly different command for Windows
module.exports = /^win/.test( process.platform ) ? 'grunt.cmd' : 'grunt';