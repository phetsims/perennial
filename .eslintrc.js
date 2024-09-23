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
          // TODO: This was likely missed when pointing everything to chipper/tsconfig/eslint-all/tsconfig.json, see https://github.com/phetsims/chipper/issues/1468
          __dirname + '/tsconfig.json'
        ]
      }
    }
  ]
};