// Copyright 2024, University of Colorado Boulder

import nodeEslintConfig from './js/eslint/config/node.eslint.config.mjs';


/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...nodeEslintConfig,
  {
    rules: {

      // Overrides so that perennial can import its own node_modules directly instead of using npm-dependencies/
      'no-restricted-imports': 'off'
    }
  },
  {
    // TODO: Use eslint/config/util/allowFloatingPromises instead, see https://github.com/phetsims/chipper/issues/1541
    files: [ 'js/scripts/**/*', 'js/grunt/tasks/**/*' ],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off'
    }
  }
];