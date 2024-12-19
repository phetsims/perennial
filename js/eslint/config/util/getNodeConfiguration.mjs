// Copyright 2018, University of Colorado Boulder
// @author Michael Kauzmann

import globals from 'globals';

/**
 * The node-specific eslint config applied only to "server-side" files that aren't run in sims. Factored out from
 * node.eslint.config for reuse in the root config.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations
 * @author Sam Reid (PhET Interactive Simulations)
 */
const getNodeConfiguration = ( pattern = {} ) => {
  return [
    {
      languageOptions: {
        globals: {
          ...globals.node
        }
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'phet/no-import-from-grunt-tasks': 'error',
        'phet/grunt-task-kebab-case': 'error',
        'phet/default-export-class-should-register-namespace': 'off',

        // phet-specific require statement rules
        'phet/require-statement-match': 'error',
        'phet/require-statement-extension': 'error',
        'phet/no-property-in-require-statement': 'error',

        // Rule that prevents importing from installed node_modules instead of reusing the installation from perennial
        'no-restricted-imports': [
          'error', ...[ 'puppeteer', 'winston', 'axios', 'qunit' ].map( name => {
            return {
              name: name,
              message: 'Prefer importing from perennial/js/npm-dependencies instead of installing a separate copy'
            };
          } )
        ]
      },
      ...pattern
    }
  ];
};

export default getNodeConfiguration;