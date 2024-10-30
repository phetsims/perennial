// Copyright 2024, University of Colorado Boulder

/**
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
export const phetSimBrowserGlobalsObject = {

  //=============================================================================================
  // globals that should never be accessed
  //=============================================================================================

  // TODO: Does this work if they are overridden later? https://github.com/phetsims/chipper/issues/1485
  // TODO: Is this still needed? https://github.com/phetsims/chipper/issues/1485
  // Using window.event is most likely a bug, instead the event should be passed through via a parameter,
  // discovered in https://github.com/phetsims/scenery/issues/1053
  event: 'off',

  //=============================================================================================
  // read-only globals
  //=============================================================================================

  phet: 'readonly',

  // allow assertions
  assert: 'readonly',

  // allow slow assertions
  assertSlow: 'readonly',

  phetio: 'readonly',

  // underscore, lodash
  _: 'readonly',

  // jQuery
  $: 'readonly',

  // jQuery for type documentation
  JQuery: 'readonly',

  // JSON diffs
  jsondiffpatch: 'readonly',

  // QUnit
  QUnit: 'readonly',

  // Misc
  QueryStringMachine: 'readonly',
  QueryStringMachineSchema: 'readonly',
  QSMParsedParameters: 'readonly',

  // Prism is a syntax highlighter that renders code in the browser. It is used for PhET-iO wrappers and for a11y.
  // TODO: define only where needed https://github.com/phetsims/chipper/issues/1485
  Prism: 'readonly',

  // sole/tween.js
  TWEEN: 'readonly',

  // TODO: redundant right? https://github.com/phetsims/chipper/issues/1485
  window: 'readonly',

  // TODO: old and unused right? Otherwise define only where needed https://github.com/phetsims/chipper/issues/1485
  handlePlaybackEvent: 'readonly',

  // TODO: define only where needed. https://github.com/phetsims/chipper/issues/1485
  paper: 'readonly',

  // TODO: define only where needed https://github.com/phetsims/chipper/issues/1485
  pako: 'readonly',

  // define globals for missing Web Audio types, see https://github.com/phetsims/chipper/issues/1214
  // TODO: define only where needed https://github.com/phetsims/chipper/issues/1485
  OscillatorType: 'readonly',
  AudioContextState: 'readonly',

  // type for QUnit assert
  // TODO: define only where needed https://github.com/phetsims/chipper/issues/1485
  Assert: 'readonly',

  // TODO: redundant right? https://github.com/phetsims/chipper/issues/1485
  fetch: 'readonly',

  // TODO: define only where needed https://github.com/phetsims/chipper/issues/1485
  // React
  React: 'readonly',
  ReactDOM: 'readonly',

  BigInt: 'readonly',

  FlatQueue: 'readonly'
};

const phetSimBrowserGlobals = {
  languageOptions: {
    globals: phetSimBrowserGlobalsObject
  }
};

export default phetSimBrowserGlobals;