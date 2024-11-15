// Copyright 2024, University of Colorado Boulder

/**
 * Instead of using __dirname, which doesn't work for type:module mode (only commonjs). We cannot factoru out
 * "import.meta.url" because it is different based on the file context you call it in.
 *
 * Usage will look something like this:
 *
 * // @ts-expect-error - until we have "type": "module" in our package.json
 * const __dirname = dirname( import.meta.url );
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

import path from 'path';
import { fileURLToPath } from 'url';

export default function dirname( url: string ): string {
  const filename = fileURLToPath( url );
  return path.dirname( filename );
}