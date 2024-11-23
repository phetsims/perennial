// Copyright 2024, University of Colorado Boulder

/**
 * Like assertions, but call sites can be stripped out during the babel step during the build, without another flag.
 * We choose the term affirm since it has a positive connotation, and has a similar letter pattern as assert.
 * Also, the term affirm is not otherwise used in our codebase.
 *
 * assert
 * affirm
 *
 * If/when this becomes the predominant use case, it can be renamed to assert() and the legacy assert can be deleted
 * or renamed.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

type IntentionalAny = any;

// Define an interface that includes the optional 'assert' property
type GlobalWithAssert = {
  assert?: boolean;
};

// Respect the global assert flag, which can be set to false to disable all assertions
const isBrowser = globalThis.hasOwnProperty( 'window' );
const isNode = !isBrowser;

export default function affirm( predicate: unknown, ...messages: IntentionalAny[] ): asserts predicate {

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