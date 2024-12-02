// Copyright 2018-2024, University of Colorado Boulder

import browserEslintConfig from './browser.eslint.config.mjs';

/**
 * Eslint config applied only to simulations.
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default [
  ...browserEslintConfig,
  {
    rules: {
      'phet/bad-sim-text': 'error'
    }
  },
  {
    // Most html files don't need to behave like sims
    files: [ '**/*.html' ],
    rules: {
      'phet/bad-sim-text': 'off'
    }
  }
];