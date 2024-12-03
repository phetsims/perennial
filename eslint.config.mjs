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
  }
];