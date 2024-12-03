// Copyright 2024, University of Colorado Boulder

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */

// Use nopt to guarantee compatibility with grunt. See usage site: https://github.com/phetsims/chipper/issues/1459
// See usage in chipper/node_modules/grunt-cli/bin/grunt
import nopt from 'nopt';
import { IntentionalPerennialAny } from '../../../browser-and-node/PerennialTypes.js';

const options = nopt( {}, {}, process.argv, 2 );

export default function getOption( keyName: string ): IntentionalPerennialAny {
  return options[ keyName ];
}

export function isOptionKeyProvided( keyName: string ): boolean {
  return options[ keyName ] !== undefined;
}