// Copyright 2024, University of Colorado Boulder
/**
 * @author Sam Reid (PhET Interactive Simulations)
 */
module.exports = {
  extends: '../chipper/eslint/node_eslintrc.js',
  overrides: [
    {
      files: [
        '**/*.ts'
      ],
      parserOptions: {
        project: [

          // Support both perennial and perennial-alias
          __dirname + '/tsconfig.json'
        ]
      }
    }
  ]
};