// Copyright 2015-2021, University of Colorado Boulder

import stylisticEslintPlugin from '@stylistic/eslint-plugin';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptEslintParser from '@typescript-eslint/parser';
import html from 'eslint-plugin-html';
import globals from 'globals';
import getNodeConfiguration from './util/getNodeConfiguration.mjs';
import phetRulesPlugin from './util/phetRulesPlugin.mjs';
import rootRules from './util/rootRules.mjs';
import rootRulesTypeScript from './util/rootRulesTypeScript.mjs';


// Keep this in a separate block from all other keys to make sure this behaves globally. These paths are relative to the root of a repo.
const TOP_LEVEL_IGNORES = {
  ignores: [
    '.git/',
    'build/',
    'dist/',
    'node_modules/',
    'templates/',
    'js/*Strings.ts',
    'images/',
    'doc/',
    'sounds/',
    'mipmaps/',
    'assets/',
    '*_en.html',
    '*-tests.html',
    '*_a11y_view.html',
    '.scenerystack/'
  ]
};

// Adapt an eslint config so it is suitable for a non-top-level location. This is because some config assumes paths
// from the top of a repo. We only want to use the above "ignores" paths when at the root level of a repo. For
// example, don't want to ignore `js/common/images/*`.
export function mutateForNestedConfig( eslintConfig ) {
  return eslintConfig.filter( configObject => configObject !== TOP_LEVEL_IGNORES );
}

/**
 * The base eslint configuration for the PhET projects.
 *
 * Please note! Changing this file can also effect phet website repos. Please let that team know when changing.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
export default [
  {
    // Keep this in a separate block from all other keys to make sure this behaves globally.
    files: [ '{**/*,*}.{js,ts,jsx,tsx,html,mjs,cjs}' ]
  },
  TOP_LEVEL_IGNORES,

  // Main config block that applies everywhere. Do NOT add `files` or `ignores` here.
  {
    plugins: {
      phet: phetRulesPlugin
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },

    languageOptions: {

      // Without a parser, .js files are linted without es6 transpilation. Use the same parser that we use for TypeScript.
      parser: typescriptEslintParser,
      globals: {
        ...globals.es2018
      }
    },

    rules: rootRules
  },

  // TypeScript files config block.
  {
    files: [
      '**/*.ts',
      '**/*.tsx'
    ],
    languageOptions: {
      parserOptions: {
        projectService: true // Look up type information from the closest tsconfig.json
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      '@stylistic': stylisticEslintPlugin
    },
    rules: rootRulesTypeScript
  },

  // Only HTML Files
  {
    files: [ '**/*.html' ],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      // DUPLICATION ALERT, this overrides the base rule, just for HTML.
      'no-multiple-empty-lines': [ 'error', { max: 2, maxBOF: 2, maxEOF: 1 } ],
      'bad-sim-text': 'off'
    },
    // Lint javascript in HTML files too
    plugins: {
      html: html
    }
  },

  // Not HTML files
  {
    ignores: [ '**/*.html' ],
    rules: {

      // Require or disallow newline at the end of files. Not a good fit for HTML, since that just moves the
      // `<script>` tag up to the same line as the last javscript code
      'eol-last': [ 'error', 'never' ]
    }
  },

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // File-specific overrides should go after the main configuration and rules are set up (above).
  //
  //

  // A couple of workarounds to make our testing files a bit easier.
  {
    files: [
      '**/*[Tt]est*.{js,ts,jsx,tsx}',
      '**/*qunit*.{js,ts,jsx,tsx}',
      '**/*QUnit*.{js,ts,jsx,tsx}'
    ],
    languageOptions: {
      globals: {
        QUnit: 'readonly', // QUnit
        Assert: 'readonly' // type for QUnit assert
      }
    },
    rules: {

      // Test files are allowed to use bracket notation to circumnavigate private member access. Typescript
      // doesn't complain when accessing a private member this way as an intentional "escape hatch".
      // Decision in https://github.com/phetsims/chipper/issues/1295, and see https://github.com/microsoft/TypeScript/issues/19335
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'off'
    }
  },

  // Use node configuration just for these two files
  ...getNodeConfiguration( {
    files: [
      '**/Gruntfile.{js,cjs}',
      '**/eslint.config.mjs'
    ]
  } ),
  {
    files: [ '**/Gruntfile.{js,cjs}' ],
    rules: {
      strict: 'off'
    }
  }
];