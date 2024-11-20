// Copyright 2002-2015, University of Colorado Boulder
/**
 * @fileoverview Rule to check that a require statement assigns to the correct variable name.
 * @author Sam Reid (PhET Interactive Simulations)
 * @copyright 2015 University of Colorado Boulder
 */

const path = require( 'path' );

module.exports = {
  meta: {
    type: 'suggestion', // 'problem', 'suggestion', or 'layout'
    docs: {
      description: 'Ensure require statement variable names match the module names',
      category: 'Best Practices',
      recommended: false
    },
    fixable: 'code', // 'code' or 'whitespace'
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: {
            type: 'object',
            additionalProperties: {
              type: 'string'
            }
          }
        },
        additionalProperties: false
      }
    ]
  },

  create: function( context ) {


    // Get a list of built-in Node.js modules
    const builtInModules = new Set( module.builtinModules );

    // Retrieve custom exceptions from rule options
    const options = context.options[ 0 ] || {};
    const exceptionModules = options.exceptions || {
      lodash: '_',
      underscore: '_',
      jquery: '$',
      'lodash-4.17': '_' // Note it is imported as lodash-4.17.4, but it mistakes .4 as the extension
    };

    function toCamelCase( str ) {
      return str.replace( /[-_](.)/g, ( _, group1 ) => group1.toUpperCase() );
    }

    function getModuleName( requirePath ) {
      // Handle scoped packages like '@namespace/module-name'
      if ( requirePath.startsWith( '@' ) ) {
        const parts = requirePath.split( '/' );
        return parts.length > 1 ? parts[ 1 ] : parts[ 0 ];
      }
      else {
        const parts = requirePath.split( '/' );
        return parts[ parts.length - 1 ];
      }
    }

    return {
      VariableDeclaration( node ) {

        // Here is the AST of a typical require statement node, for reference
        //var exemplar = {
        //  'type': 'VariableDeclaration',
        //  'declarations': [
        //    {
        //      'type': 'VariableDeclarator',
        //      'id': {
        //        'type': 'Identifier',
        //        'name': 'EquationsScreen'
        //      },
        //      'init': {
        //        'type': 'CallExpression',
        //        'callee': {
        //          'type': 'Identifier',
        //          'name': 'require'
        //        },
        //        'arguments': [
        //          {
        //            'type': 'Literal',
        //            'value': 'FUNCTION_BUILDER/equations/EquationsScreen',
        //            'raw': "'FUNCTION_BUILDER/equations/EquationsScreen'"
        //          }
        //        ]
        //      }
        //    }
        //  ],
        //  'kind': 'var'
        //};
        node.declarations.forEach( declaration => {
          const init = declaration.init;
          if (
            init &&
            init.type === 'CallExpression' &&
            init.callee.name === 'require' &&
            init.arguments.length === 1 &&
            init.arguments[ 0 ].type === 'Literal' &&
            typeof init.arguments[ 0 ].value === 'string' &&
            declaration.id.type === 'Identifier' // Skip destructuring assignments
          ) {
            const lhs = declaration.id.name;
            const rhs = init.arguments[ 0 ].value;

            // Determine if the module is built-in
            const isBuiltIn = builtInModules.has( rhs );

            // Extract the module name from the require path
            let moduleName;

            if ( rhs.startsWith( '.' ) ) {
              // Relative path
              moduleName = path.basename( rhs );

              // Check for and remove file extension
              const extName = path.extname( moduleName );
              const hasExtension = extName.length > 0;
              if ( hasExtension ) {
                moduleName = moduleName.slice( 0, -extName.length );
              }
            }
            else if ( !isBuiltIn ) {
              // External module from node_modules or scoped package
              moduleName = getModuleName( rhs );
            }
            else {
              // Built-in module, skip variable name check
              return;
            }

            // Convert moduleName to camelCase for comparison
            const camelCaseModuleName = toCamelCase( moduleName );

            // Determine the expected variable name
            const expectedVariableName = exceptionModules[ moduleName ] || camelCaseModuleName;

            // Compare the LHS variable name with the expected variable name
            if ( lhs !== expectedVariableName && lhs !== moduleName ) {
              context.report( {
                node: declaration.id,
                message: `Variable name '${lhs}' does not match module name '${moduleName}'. Expected '${expectedVariableName} or ${moduleName}'.`
                // No autofix for variable names to avoid unintended side effects
              } );
            }
          }
        } );
      }
    };
  }
};