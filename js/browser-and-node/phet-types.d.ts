// Copyright 2021, University of Colorado Boulder

/* eslint-disable no-var */

/**
 * Ambient type declarations for PhET code.  Many of these definitions can be moved/disabled once the common code is
 * converted to TypeScript. Note that this file is in globals mode, so the `declare var` statements will be available
 * as globals like `phetio` and also as properties on the `window` object like `window.phetio`.
 *
 * See also phet-types-module.d.ts which is in module mode.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

// NOTE: we cannot use IntentionalAny in this file because it is a global file, and IntentionalAny is a module file
// Therefore, we must a custom declaration. See https://github.com/phetsims/perennial/issues/406
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

declare var assert: undefined | ( ( x: Any, ...messages: Any[] ) => void );
declare var assertSlow: undefined | ( ( x: Any, ...messages: Any[] ) => void );
declare var sceneryLog: null | false | ( Record<string, ( ob: Any, style?: string ) => void> & {
  push(): void;
  pop(): void;
  getDepth(): number;
} );
declare var phet: Record<string, Any>;

// globals used in Sim.ts
declare var phetSplashScreenDownloadComplete: ( brand: string ) => number; // returns the progress bar width for sizing.
declare var TWEEN: {
  update: ( dt: number ) => void;
  Tween: Any;
  Easing: Any;
};
declare var phetSplashScreen: { dispose: () => void };
declare var phetio: Record<string, Any>;

// Typing for linebreaker-1.1.0.js preload
declare type LineBreakerBreak = {
  position: number;
  required: boolean;
};
declare type LineBreakerType = {
  nextBreak(): LineBreakerBreak | null;

  // We make it iterable
  [ Symbol.iterator ](): Iterator<LineBreakerBreak, undefined>;
};
declare var LineBreaker: {
  new( str: string ): LineBreakerType;
};

declare var assertions: {
  enableAssert: () => void;
  assertionHooks: Array<() => void>;
};

// Experiment to allow accessing these off window. See https://stackoverflow.com/questions/12709074/how-do-you-explicitly-set-a-new-property-on-window-in-typescript
declare global {
  interface Window { // eslint-disable-line @typescript-eslint/consistent-type-definitions
    phet: typeof phet;
    phetio: typeof phetio;
  }
}

// Adapted from https://github.com/mourner/flatqueue/blob/main/index.d.ts
declare class FlatQueue<T> {
  public readonly length: number;

  public constructor();

  public clear(): void;

  public push( item: T, priority: number ): void;

  public pop(): T | undefined;

  public peek(): T | undefined;

  public peekValue(): number | undefined;

  public shrink(): void;
}