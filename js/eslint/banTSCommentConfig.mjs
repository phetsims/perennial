// Copyright 2024, University of Colorado Boulder

/**
 * Most strict form of ban-ts-comment which is often reused in simulations.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default [ {
  files: [ '**/*.ts', '**/*.tsx' ],
  rules: {
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': true,
        'ts-ignore': true,
        'ts-check': true,
        'ts-nocheck': true
      }
    ]
  }
} ];