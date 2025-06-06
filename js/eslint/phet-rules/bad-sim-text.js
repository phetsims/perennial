// Copyright 2019-2022, University of Colorado Boulder


/**
 * Lint detector for invalid text.
 * Lint is disabled for this file so the bad texts aren't themselves flagged.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

const getBadTextTester = require( './getBadTextTester' );

module.exports = {
  create: function( context ) {

    // see getBadTextTester for schema.
    const forbiddenTextObjects = [

      // should be using phet.dot.Utils.roundSymmetric, Math.round does not treat positive and negative numbers
      // symmetrically see https://github.com/phetsims/dot/issues/35#issuecomment-113587879
      { id: 'Math.round(', codeTokens: [ 'Math', '.', 'round', '(' ] },

      // should be using `DOT/dotRandom`
      { id: 'Math.random()', codeTokens: [ 'Math', '.', 'random', '(', ')' ] },
      { id: '_.shuffle(', codeTokens: [ '_', '.', 'shuffle', '(' ] },
      { id: '_.sample(', codeTokens: [ '_', '.', 'sample', '(' ] },
      { id: '_.random(', codeTokens: [ '_', '.', 'random', '(' ] },
      { id: 'new Random()', codeTokens: [ 'new', 'Random', '(', ')' ] },

      // You can use parseInt if you need a non base 10 radix
      { id: 'Number.parseInt(', codeTokens: [ 'Number', '.', 'parseInt', '(' ] },
      { id: 'Array.prototype.find', codeTokens: [ 'Array', '.', 'prototype', '.', 'find' ] },

      // ParallelDOM.pdomOrder should not be mutated, instead only set with `setPDOMOrder`
      '.pdomOrder.push(',

      // Should import dotRandom instead of using the namespace
      'phet.dot.dotRandom',

      // Prefer using Pointer.isTouchLike() to help support Pen. This is not set in stone, please see
      // https://github.com/phetsims/scenery/issues/1156 and feel free to discuss if there are usages you want to support.
      ' instanceof Touch ',

      // Prevent accidental importing of files from the TypeScript build output directory
      'chipper/dist',

      // Relying on these in sim code can break PhET-iO playback, instead use Sim.dimensionProperty, see https://github.com/phetsims/joist/issues/768
      'window.innerWidth',
      'window.innerHeight',

      // These are types that can be inferred by the common code and provided arguments
      'new Enumeration<',
      'new EnumerationProperty<',

      // Please use Text/RichText.STRING_PROPERTY_TANDEM_NAME when appropriate (though not all usages apply here, and
      // you can ignore this rule), https://github.com/phetsims/scenery/issues/1451#issuecomment-1270576831
      '\'stringProperty\'',

      // Just pass these through, they work with structured cloning as is! See https://github.com/phetsims/tandem/issues/280
      ' NumberIO.toStateObject',
      ' NumberIO.fromStateObject',
      ' BooleanIO.toStateObject',
      ' BooleanIO.fromStateObject',
      ' StringIO.toStateObject',
      ' StringIO.fromStateObject',

      'new Tandem(', // use createTandem(), never instantiate your own Tandem please

      // Instead of using your own assertion, see and use Disposable.assertNotDisposable(), https://github.com/phetsims/axon/issues/436
      'dispose is not supported, exists for the lifetime of the sim',

      // In sims, don't allow setTimout and setInterval calls coming from window, see https://github.com/phetsims/phet-info/issues/59
      {
        id: 'setTimeout(',
        regex: /(window\.| )setTimeout\(/
      },
      {
        id: 'setInterval(',
        regex: /(window\.| )setInterval\(/
      },

      // See https://github.com/phetsims/tandem/issues/302. We don't want to duplicate this type everywhere. Also use 2
      // spaces to prevent false positive for class fields like `public tandem: Tandem;` (which is fine).
      {
        id: 'Do not duplicate the definition of Tandem, instead use PickRequired<PhetioObjectOptions, \'tandem\'>',
        regex: / {2}tandem\??: Tandem;/
      },

      // DOT/Utils.toFixed or DOT/Utils.toFixedNumber should be used instead of toFixed.
      // JavaScript's toFixed is notoriously buggy. Behavior differs depending on browser,
      // because the spec doesn't specify whether to round or floor.
      {
        id: '.toFixed(', // support regex with english names this way
        regex: new RegExp( '(?<!Utils)\\.toFixed\\(' ) // NOTE: eslint parsing breaks when using regex syntax like `/regex/`
      },
      {
        id: 'Import statements require a *.js suffix',
        predicate: line => {
          if ( line.trim().indexOf( 'import \'' ) === 0 && line.indexOf( ';' ) >= 0 && line.indexOf( '.js' ) === -1 ) {
            return false;
          }
          return true;
        }
      },

      {
        id: 'Prefer "Standard PhET-iO Wrapper to "standard wrapper"',
        regex: /[Ss][Tt][Aa][Nn][Dd][Aa][Rr][Dd][- _][Ww][Rr][Aa][Pp][Pp][Ee][Rr]/
      },

      // combo box is two words, moved to sim-specific bad text from the general one because of https://github.com/phetsims/website-meteor/issues/690
      'combobox', // prefer combo box
      'Combobox', // prefer Combo Box
      'COMBOBOX', // prefer COMBO_BOX

      // Converted to a module in https://github.com/phetsims/tandem/issues/316
      'phetio.PhetioIDUtils',

      // Disallow the Ohm Unicode character because it is not "normalized". Use capitalized greek omega instead (\u03A9).
      // See https://github.com/phetsims/scenery/issues/1687.
      '\\u2126'
    ];

    return {
      Program: getBadTextTester( 'bad-sim-text', forbiddenTextObjects, context )
    };
  }
};

module.exports.schema = [
  // JSON Schema for rule options goes here
];