// Copyright 2024, University of Colorado Boulder

/**
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
export const phetSimBrowserGlobalsObject = {

  //=============================================================================================
  // globals that should never be accessed
  //=============================================================================================

  // Using `event` is most likely a bug, instead the event should be passed through via a parameter, discovered in
  // https://github.com/phetsims/scenery/issues/1053. Alternatively, if you must use `event`, you can refer to
  // window.event or disable the lint rule with an override or directive.
  event: 'off',

  //=============================================================================================
  // read-only globals
  //=============================================================================================

  phet: 'readonly',
  phetio: 'readonly',
  assert: 'readonly', // allow assertions
  assertSlow: 'readonly', // allow slow assertions
  QueryStringMachine: 'readonly',
  Fluent: 'readonly',

  _: 'readonly', // underscore, lodash
  $: 'readonly' // jQuery
};

const phetSimBrowserGlobals = {
  languageOptions: {
    globals: phetSimBrowserGlobalsObject
  }
};

export default phetSimBrowserGlobals;