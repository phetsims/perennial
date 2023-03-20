// Copyright 2023, University of Colorado Boulder

/**
 * @fileoverview no-view-imported-from-model
 * Fails is you import something from /view/ inside a model file with a path like /model/
 * @copyright 2023 University of Colorado Boulder
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const isModelFileRegex = /[\\/]model[\\/]/;
const isViewFileRegex = /[\\/]view[\\/]/;

module.exports = context => {
  if ( isModelFileRegex.test( context.getFilename() ) ) {
    return {
      ImportDeclaration: node => {
        const importValue = node.source.value;

        // If the import has /view/ in it.
        if ( isViewFileRegex.test( importValue ) ) {

          // Some special cases that are too common for PhET to care about this failure for.
          if ( !importValue.endsWith( 'Colors.js' ) && !importValue.endsWith( 'ModelViewTransform2.js' ) ) {
            context.report( {
              node: node,
              loc: node.loc,
              message: `model import statement should not import the view: ${importValue.replace( '/..', '' )}`
            } );
          }
        }
      }
    };
  }
  return {};
};

module.exports.schema = [
  // JSON Schema for rule options goes here
];