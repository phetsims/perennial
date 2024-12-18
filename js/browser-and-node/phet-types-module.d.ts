// Copyright 2023, University of Colorado Boulder

/**
 * Ambient type declarations for PhET code that requires import statements. Please note this type declaration file is in
 * module model, unlike phet-types.d.ts which is in globals mode.  We cannot use globals mode here because we must import
 * lodash.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import type { FluentBundle, FluentResource } from '@types/fluent';
import * as lodash from 'lodash';

declare global {

  // Specify the correct type for lodash as a global object to work around the TS2686 warning in WebStorm/IntelliJ
  // See https://github.com/phetsims/chipper/issues/1402
  const _: typeof lodash;

  // TODO: Move Fluent to chipper, once we import Fluent from node_modules
  const Fluent: {
    FluentBundle: FluentBundle;
    FluentResource: FluentResource;
  }
  namespace Fluent {
    declare type FluentBundle = FluentBundle;
    declare type FluentResource = FluentResource;
  }
}