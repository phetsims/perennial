// Copyright 2024, University of Colorado Boulder

/**
 * @author Sam Reid (PhET Interactive Simulations)
 */

import grunt from 'grunt';

let buildLocal: any;
try {
  buildLocal = grunt.file.readJSON( `${process.env.HOME}/.phet/build-local.json` );
}
catch( e ) {
  // Handle the lack of build.json
  buildLocal = {};
}

export default buildLocal;