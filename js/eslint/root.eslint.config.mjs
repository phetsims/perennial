// Copyright 2015-2021, University of Colorado Boulder

import stylisticEslintPlugin from '@stylistic/eslint-plugin';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptEslintParser from '@typescript-eslint/parser';
import html from 'eslint-plugin-html';
import globals from 'globals';
import getNodeConfiguration from './getNodeConfiguration.mjs';
import phetRulesPlugin from './phetRulesPlugin.mjs';
import rootRules from './rootRules.mjs';
import rootRulesTypeScript from './rootRulesTypeScript.mjs';

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
  {
    // Keep this in a separate block from all other keys to make sure this behaves globally.
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
      '*_a11y_view.html'
    ]
  },

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
      '**/Gruntfile.js',
      '**/eslint.config.mjs'
    ]
  } ),

  // For entry points like scripts and "grunt" tasks, we often end with a floating promise which is not a problem
  {
    files: [
      '**/js/grunt/tasks/**/*',
      '**/js/scripts/**/*'
    ],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off'
    }
  }
];