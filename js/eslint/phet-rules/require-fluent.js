// Copyright 2025, University of Colorado Boulder

/**
 * @fileoverview Lint rule to require that all strings are pulled in from the fluent module instead
 * of the string module.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

// Convert a dash separated repository name to PascalCase.
// For example, 'membrane-transport' becomes 'MembraneTransport'.
function toPascalCase( repoName ) {

  // Catches any character after a dash and replaces it with the uppercase version of that character.
  const camel = repoName.replace( /-(.)/g, ( _, group1 ) => group1.toUpperCase() );

  // Capitalize the first letter to convert to PascalCase.
  return camel.charAt( 0 ).toUpperCase() + camel.slice( 1 );
}

module.exports = {
  create: context => {

    // Get the full file path from ESLint context, then extract the directory name
    // immediately before '/js/'. For example, if filename is
    // '/repos/membrane-transport/js/someFile.js', repoNameMatch[1] will be 'membrane-transport'
    const filename = context.getFilename();
    const repoNameMatch = filename.match( /[\\/]([^\\/]+)[\\/]js[\\/]/ );

    // The repository may be null if linting a file that is not under the js directory,
    // such as a Gruntfile or config file. It's OK to skip those.
    const repoName = repoNameMatch ? repoNameMatch[ 1 ] : null;
    const stringsModuleName = repoName ? `${toPascalCase( repoName )}Strings` : null;

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

      // import {{Repo}}Strings from '…';
      ImportDefaultSpecifier( node ) {
        if ( node.local.name === stringsModuleName ) {
          report( node.local );
        }
      },

      // Any runtime identifier usage
      Identifier( node ) {
        if ( node.name === stringsModuleName ) {
          report( node );
        }
      }
    };
  }
};