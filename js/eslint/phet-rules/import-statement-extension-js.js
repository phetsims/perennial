// Copyright 2024, University of Colorado Boulder

/**
 * Disallows importing files with ".ts", ".tsx", or ".mts" extensions.
 * Enforces the use of ".js", ".jsx", or ".mjs" extensions instead.
 * Automatically fixes the import paths by replacing the disallowed extensions.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow specific TypeScript-related file extensions in relative import paths and enforce JavaScript equivalents.',
      category: 'Best Practices',
      recommended: false
    },
    fixable: 'code',
    schema: [] // no options
  },
  create: function( context ) {
    // Define a mapping from disallowed extensions to their preferred JavaScript counterparts
    const extensionMapping = {
      '.ts': '.js',
      '.tsx': '.jsx',
      '.mts': '.mjs'
    };

    // Create a regular expression to match the disallowed extensions
    const disallowedExtensionsRegex = /\.(ts|tsx|mts)$/;

    return {
      ImportDeclaration( node ) {
        const source = node.source.value;

        // Only process relative import paths
        if ( source.startsWith( '.' ) ) {
          const match = source.match( disallowedExtensionsRegex );

          if ( match ) {
            const currentExtension = match[ 0 ];
            const newExtension = extensionMapping[ currentExtension ];

            if ( newExtension ) {
              context.report( {
                node: node.source,
                message: `Importing "${currentExtension}" files is not allowed. Use "${newExtension}" instead.`,
                fix: function( fixer ) {
                  const importSource = node.source;
                  const raw = importSource.raw;

                  // Determine which quote is used (single or double)
                  const quote = raw[ 0 ]; // Assumes the first character is the quote

                  // Replace the disallowed extension with the new extension
                  const newValue = source.replace( disallowedExtensionsRegex, newExtension );

                  // Construct the new import path with the original quotes
                  const newImportPath = `${quote}${newValue}${quote}`;

                  // Replace the entire source node with the new import path
                  return fixer.replaceText( importSource, newImportPath );
                }
              } );
            }
          }
        }
      }
    };
  }
};