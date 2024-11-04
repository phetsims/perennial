// Copyright 2016, University of Colorado Boulder
/**
 * @fileoverview Rule to check that a require statement does not also do a property access
 * @author Sam Reid (PhET Interactive Simulations)
 * @copyright 2016 University of Colorado Boulder
 */


//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  create: function( context ) {

    return {

      VariableDeclaration: function( node ) {

        if ( node.declarations &&
             node.declarations.length > 0 &&
             node.declarations[ 0 ]?.init?.type === 'MemberExpression' &&
             node.declarations[ 0 ].init.property?.name !== 'default' &&
             node.declarations[ 0 ].init?.object?.callee?.name === 'require' ) {

          context.report( {
            node: node,
            loc: node.loc.start,
            message: 'property access in require statement'
          } );
        }
      }
    };
  }
};

module.exports.schema = [
  // JSON Schema for rule options goes here
];