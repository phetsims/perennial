// Copyright 2024, University of Colorado Boulder

/**
 * Like assert.js, with the following differences:
 *
 * 1. Can be used in browser/node/both code
 * 2. Call are stripped out during the babel step, without another guard
 * 3. Adds an `asserts` type to the predicate, which is a TypeScript feature that allows the type checker to
 *    understand that the predicate is true after the call to affirm.
 *
 * We choose the term affirm since it has a positive connotation, and has a similar letter pattern as assert, and since
 * the term `affirm` is not otherwise used in our codebase.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import { IntentionalPerennialAny } from './PerennialTypes.js';

// Define an interface that includes the optional 'assert' property
type GlobalWithAssert = {
  assert?: boolean;
};

// Respect the global assert flag, which can be set to false to disable all assertions
const isBrowser = globalThis.hasOwnProperty( 'window' );
const isNode = !isBrowser;

// NOTE: DO NOT export this function! At this time, there is no way to strip out usages of this boolean when building. Instead, see affirmLazy() or, if you must, use `if( window.assert ){...}`. See https://github.com/phetsims/assert/issues/5
// Use this as a boolean like window.assert to write code that is stripped out when assertions are disabled
export function isAffirmEnabled(): boolean {

  // Cast 'globalThis' to 'GlobalWithAssert' to access 'assert' safely
  return isNode || !!( globalThis as GlobalWithAssert ).assert;
}

export default function affirm( predicate: unknown, ...messages: IntentionalPerennialAny[] ): asserts predicate {

  if ( isAffirmEnabled() && !predicate ) {

    // Add "Affirmation Failed" to the front of the message list
    const affirmPrefix = messages.length > 0 ? 'Affirmation failed: ' : 'Affirmation failed';
    console.error( affirmPrefix, ...messages );

    affirmationHooks.forEach( hook => hook() );

    if ( debuggerMode ) {
      debugger; // eslint-disable-line no-debugger
    }

    // Check if Error.stackTraceLimit exists and is writable
    const descriptor = Object.getOwnPropertyDescriptor( Error, 'stackTraceLimit' );
    const stackTraceWritable = descriptor && ( descriptor.writable || ( descriptor.set && typeof descriptor.set === 'function' ) );

    if ( stackTraceWritable ) {
      // @ts-expect-error - At some point this will no longer be experimental for the Browser error constructor, but not this day.
      Error.stackTraceLimit = 20;
    }

    throw new Error( affirmPrefix + messages.join( '\n ' ) );
  }
}

/**
 * A lazy version of affirm that accepts a function which returns the predicate.
 *
 * If assertions are disabled, `predicate` won't even be called.
 * If assertions are enabled, `affirmCallback` calls `affirm` with the returned value.
 */
export function affirmCallback( predicate: () => unknown, ...messages: IntentionalPerennialAny[] ): void {
  isAffirmEnabled() && affirm( predicate(), ...messages );
}

const affirmationHooks: VoidFunction[] = [];

export function addAffirmationHook( hook: () => void ): void {
  affirmationHooks.push( hook );
}

let debuggerMode = false;

export function setAffirmationDebuggerMode( isDebuggerMode: boolean ): void {
  debuggerMode = isDebuggerMode;
}