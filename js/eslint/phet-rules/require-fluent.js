// Copyright 2025, University of Colorado Boulder

/**
 * @fileoverview Lint rule to require that all strings are pulled in from the fluent module instead
 * of the string module.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

module.exports = {
  create: context => {

    /**
     * Report the given node and (optionally) replace it.
     * @param {ASTNode} node
     */
    function report( node ) {
      context.report( {
        node: node,
        message: 'Use the fluent module instead of strings module.'
      } );
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {

      // import MembraneTransportStrings from '…';
      ImportDefaultSpecifier( node ) {
        if ( node.local.name === 'MembraneTransportStrings' ) {
          report( node.local );
        }
      },

      // Any runtime identifier usage
      Identifier( node ) {
        if ( node.name === 'MembraneTransportStrings' ) {
          report( node );
        }
      }
    };
  }
};