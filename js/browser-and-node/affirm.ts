// Copyright 2024, University of Colorado Boulder

import { IntentionalPerennialAny } from './PerennialTypes.js';

// Define an interface that includes the optional 'assert' property
type GlobalWithAssert = {
  assert?: boolean;
};

// Respect the global assert flag, which can be set to false to disable all assertions
const isBrowser = globalThis.hasOwnProperty( 'window' );
const isNode = !isBrowser;

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
export default function affirm( predicate: unknown, ...messages: IntentionalPerennialAny[] ): asserts predicate {

  // Cast 'globalThis' to 'GlobalWithAssert' to access 'assert' safely
  const isAssertEnabled = isNode || ( globalThis as GlobalWithAssert ).assert;

  if ( isAssertEnabled && !predicate ) {

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

const affirmationHooks: ( () => void )[] = [];

export function addAffirmationHook( hook: () => void ): void {
  affirmationHooks.push( hook );
}

let debuggerMode = false;

export function setAffirmationDebuggerMode( isDebuggerMode: boolean ): void {
  debuggerMode = isDebuggerMode;
}