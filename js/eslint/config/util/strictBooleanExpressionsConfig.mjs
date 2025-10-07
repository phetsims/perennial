// Copyright 2024, University of Colorado Boulder

/**
 * ESLint configuration fragment that enables @typescript-eslint/strict-boolean-expressions with PhET defaults.
 * Spread this array into a repo's eslint.config.mjs to apply the rule to TypeScript files.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

export default [ {
  files: [ '**/*.ts', '**/*.tsx' ],
  plugins: {
    '@typescript-eslint': typescriptEslintPlugin
  },
  rules: {
    '@typescript-eslint/strict-boolean-expressions': [ 'error', {
      allowAny: true,
      allowNullableBoolean: true,
      allowNullableEnum: false,
      allowNullableNumber: true,
      allowNullableObject: true,
      allowNullableString: true,
      allowNumber: true,
      allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
      allowString: true
    } ]
  }
} ];
