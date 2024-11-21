// Copyright 2024, University of Colorado Boulder

/**
 * Importing a relative path should include a file extension.
 * This rule ensures that all relative import paths have a suffix.
 * If no suffix is provided, it automatically adds the '.js' extension.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a file extension on relative import paths',
      category: 'Best Practices',
      recommended: false
    },
    fixable: 'code',
    schema: [] // no options
  },
  create: function( context ) {
    return {
      ImportDeclaration( node ) {
        const source = node.source.value;

        // Only process relative import paths
        if ( source.startsWith( '.' ) ) {
          // Regular expression to check for a file extension
          const hasExtension = /\.[^./\\]+$/.test( source );

          if ( !hasExtension ) {
            context.report( {
              node: node,
              message: 'Relative import paths must include a file extension.',
              fix: function( fixer ) {
                const importSource = node.source;
                const raw = importSource.raw;

                // Determine which quote is used (single or double)
                const quote = raw[ 0 ]; // Assumes the first character is the quote

                // Append the default extension (.js) to the current source value
                const newValue = source + '.js';

                // Construct the new import path with the original quotes
                const newImportPath = `${quote}${newValue}${quote}`;

                // Replace the entire source node with the new import path
                return fixer.replaceText( importSource, newImportPath );
              }
            } );
          }
        }
      }
    };
  }
};