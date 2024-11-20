// Copyright 2002-2024, University of Colorado Boulder
/**
 * @fileoverview Rule to check that a require statement extension is not provided for .js files.
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @copyright 2024 University of Colorado Boulder
 */

const path = require( 'path' );

module.exports = {
  meta: {
    type: 'suggestion', // 'problem', 'suggestion', or 'layout'
    docs: {
      description: 'Ensure require statements have same extension usages',
      category: 'Best Practices',
      recommended: false
    },
    fixable: 'code' // 'code' or 'whitespace'
  },

  create: function( context ) {
    const filename = context.getFilename();
    return {
      CallExpression( node ) {
        if (
          node.callee?.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[ 0 ].type === 'Literal' &&
          typeof node.arguments[ 0 ].value === 'string'
        ) {
          const pathString = node.arguments[ 0 ].value;

          // Extract the module name from the require path
          let moduleName;

          if ( pathString.startsWith( '.' ) ) {
            // Relative path
            moduleName = path.basename( pathString );

            // Check for and remove file extension
            const extName = path.extname( moduleName );
            const hasExtension = extName.length > 0;
            if ( hasExtension ) {
              moduleName = moduleName.slice( 0, -extName.length );
            }

            // Enforce no .js suffix for relative paths in javascript files, see https://github.com/phetsims/chipper/issues/1498
            const enforceNoJsSuffix = filename.endsWith( '.js' ) && !pathString.includes( 'node_modules' ); // Set to false if not enforcing

            if ( enforceNoJsSuffix && hasExtension && extName === '.js' ) {
              context.report( {
                node: node.arguments[ 0 ],
                message: `Require path '${pathString}' should never include'.js' extension. (It is harder to convert commonJS modules to TypeScript)`,
                fix: function( fixer ) {
                  return fixer.replaceText(
                    node.arguments[ 0 ],
                    `'${pathString.replace( '.js', '' )}'`
                  );
                }
              } );
            }
          }
        }
      }
    };
  }
};