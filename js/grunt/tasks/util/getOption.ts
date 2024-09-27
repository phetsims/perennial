// Copyright 2024, University of Colorado Boulder

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */

// Use nopt to guarantee compatibility with grunt. See usage site: https://github.com/phetsims/chipper/issues/1459
// See usage in chipper/node_modules/grunt-cli/bin/grunt
import nopt from 'nopt';

const options = nopt( {}, {}, process.argv, 2 );

// TODO: parametrize based on what you want your return type to be? https://github.com/phetsims/chipper/issues/1465
function getOption( keyName: string ): any {
  return options[ keyName ];
}

export default getOption;