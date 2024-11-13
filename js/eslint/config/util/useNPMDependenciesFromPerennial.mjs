// Copyright 2024, University of Colorado Boulder


/**
 * Rule that prevents importing from installed node_modules instead of reusing the installation from perennial
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default {
  rules: {
    'no-restricted-imports': [
      'error', ...[ 'puppeteer', 'winston', 'axios', 'qunit' ].map( name => {
        return {
          name: name,
          message: 'Prefer importing from perennial/js/npm-dependencies instead of installing a separate copy'
        };
      } )
    ]
  }
};