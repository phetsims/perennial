// Copyright 2024, University of Colorado Boulder

/**
 * Eslint config applied to code that runs in both browser and NodeJS.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

import rootEslintConfig from './root.eslint.config.mjs';

export default [

  // Here, we must have a complete set of rules for interpretation, so we include the rootEslintConfig.
  ...rootEslintConfig,

  {
    languageOptions: {
      globals: {
        // Opt into globals that we know exist in NodeJS and the browser with the same API.
        console: 'readonly'
      }
    },
    rules: {
      'phet/bad-phet-library-text': 'error',
      'phet/bad-sim-text': 'error'
    }
  }
];