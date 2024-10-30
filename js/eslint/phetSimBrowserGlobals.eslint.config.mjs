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
  phetio: 'readonly',
  assert: 'readonly', // allow assertions
  assertSlow: 'readonly', // allow slow assertions
  QueryStringMachine: 'readonly',

  _: 'readonly', // underscore, lodash
  $: 'readonly' // jQuery
};

const phetSimBrowserGlobals = {
  languageOptions: {
    globals: phetSimBrowserGlobalsObject
  }
};

export default phetSimBrowserGlobals;