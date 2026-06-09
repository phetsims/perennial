// Copyright 2024, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// TODO: this should be deprecated, see https://github.com/phetsims/totality/issues/140
// @deprecated
type Dependencies = Record<string, { sha: string; branch?: string }>;
export default Dependencies;