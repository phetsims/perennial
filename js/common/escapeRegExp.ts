// Copyright 2026, University of Colorado Boulder

/**
 * Escapes a string for use in a regular expression.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export const escapeRegExp = ( s: string ): string => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );