// Copyright 2024, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

type Dependencies = Record<string, { sha: string; branch?: string }>;
export default Dependencies;