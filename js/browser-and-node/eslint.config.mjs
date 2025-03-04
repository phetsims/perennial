// Copyright 2024, University of Colorado Boulder


import browserAndNodeEslintConfig from '../eslint/config/browser-and-node.eslint.config.mjs';

/**
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  ...browserAndNodeEslintConfig,
  {
    rules: {
      'phet/default-export-class-should-register-namespace': 'off'
    }
  }
];