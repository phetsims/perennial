// Copyright 2024, University of Colorado Boulder
/**
 * @fileoverview Lint rule to ensure the first block comment precedes the first import statement. This is because our
 *               convention is for file-level documentation to be at the top of the file, even if it is describing
 *               a class declaration. See https://github.com/phetsims/perennial/issues/447
 * @author Sam Reid (PhET Interactive Simulations)
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'layout', // Or 'problem', 'layout' seems slightly more appropriate for ordering
    docs: {
      description: 'Ensures the first block comment (/** ... */) in a file appears before the first import statement, if both exist.'
    },
    messages: {
      blockCommentAfterImport: 'The first block comment (/** ... */) must appear before the first import statement.'
    }
  },
  create: function( context ) {
    return {
      Program: function( node ) {

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Find the index of the first block comment /** ... */
        const firstBlockCommentIndex = text.indexOf( '/**' );

        // Find the index of the first import statement.
        // Using a simple regex to find 'import' at the beginning of a line
        // potentially followed by whitespace or { to be slightly more robust
        // than just indexOf('import '). The 'm' flag makes ^ match start of line.
        const importRegex = /^\s*import[\s{]/m;
        const importMatch = importRegex.exec( text );
        const firstImportIndex = importMatch ? importMatch.index : -1;

        // Check the condition: IF a block comment exists AND an import exists
        if ( firstBlockCommentIndex !== -1 && firstImportIndex !== -1 ) {

          // THEN check if the first block comment does NOT precede the first import
          if ( firstBlockCommentIndex > firstImportIndex ) {

            // Find the AST node corresponding to the first block comment to report accurately
            // This is slightly more complex than just reporting on Program node
            // but provides better location feedback.
            const comments = sourceCode.getAllComments();
            let firstBlockCommentNode = null;
            for ( const comment of comments ) {
              if ( comment.type === 'Block' && text.substring( comment.range[ 0 ], comment.range[ 0 ] + 3 ) === '/**' ) {
                firstBlockCommentNode = comment;
                break; // Found the first one
              }
            }

            context.report( {

              // Report on the specific comment node if found, otherwise fallback to Program node
              node: firstBlockCommentNode || node,
              messageId: 'blockCommentAfterImport'
            } );
          }
        }
      }
    };
  }
};