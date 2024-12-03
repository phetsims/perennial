// Copyright 2024, University of Colorado Boulder

import nodeEslintConfig from './js/eslint/config/node.eslint.config.mjs';

export const perennialRules = {
  rules: {

    // There is a complication about importing phet-core from perennial, so use `any` in this repo
    '@typescript-eslint/no-explicit-any': 'off'
  }
};

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...nodeEslintConfig,
  perennialRules,
  {
    rules: {

      // Overrides so that perennial can import its own node_modules directly instead of using npm-dependencies/
      'no-restricted-imports': 'off'
    }
  }
];