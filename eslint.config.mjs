// Copyright 2024, University of Colorado Boulder

import nodeEslintConfig from '../chipper/eslint/node.eslint.config.mjs';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...nodeEslintConfig,
  {
    rules: {

      // There is a complication about importing phet-core from perennial, so until that is resolved, use `any` here instead
      '@typescript-eslint/no-explicit-any': 'off' // TODO: Use IntentionalAny, https://github.com/phetsims/chipper/issues/1465
    }
  }
];