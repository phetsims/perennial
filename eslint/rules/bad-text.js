// Copyright 2018-2019, University of Colorado Boulder
/* eslint-disable */

/**
 * Lint detector for invalid text.  Checks the entire file and does not correctly report line number.
 * Lint is disabled for this file so the bad texts aren't themselves flagged.
 *
 * NOTE: this lint rule is applied to all lintable files in the project. If you are looking to add rules that only apply
 * to sim specific code, see `./bad-sim-text.js`
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
module.exports = function( context ) {
  'use strict';

  var badTexts = [

    // Proper casing for *boxes
    'toolBox',
    'ToolBox',
    'CheckBox',
    'checkBox',
    'Combobox',
    'combobox',

    // In ES6, extending object causes methods to be dropped
    'extends Object',

    // Forbid common duplicate words
    ' the the ',
    ' a a ',

    // For phet-io use PHET_IO in constants
    'PHETIO',
    '@return '
  ];

  // NOTE: this code is duplicated in `bad-text.js`, don't edit this without updating there too
  return {
    Program: function( node ) {
      var sourceCode = context.getSourceCode();
      var text = sourceCode.text;
      badTexts.forEach( function( badText ) {
        if ( text.indexOf( badText ) >= 0 ) {
          context.report( {
            node: node,
            message: 'File contains bad text: \'' + badText + '\''
          } );
        }
      } )
    }
  };
};

module.exports.schema = [
  // JSON Schema for rule options goes here
];