// Copyright 2024, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// TODO: move launchpad to these types
export type Repo = string;
export type SHA = string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IntentionalPerennialAny = any;

export type PackageJSON = {
  name: string;
  version: string;
  phet?: {
    runnable?: boolean;
    simulation?: boolean;
    published?: boolean;
    generatedUnitTests?: boolean;
    supportsOutputJS?: boolean;
    requireJSNamespace?: string;
    'phet-io'?: {
      wrappers?: string[];
      validation?: boolean;
    };
    supportedBrands?: string[];
    simFeatures?: {
      supportsGestureControl?: boolean;
      supportsInteractiveDescription?: boolean;
      supportsVoicing?: boolean;
      supportsCoreVoicing?: boolean;
      supportsInteractiveHighlights?: boolean;
      supportsSound?: boolean;
      supportsExtraSound?: boolean;
      supportsDynamicLocale?: boolean;
      supportsPanAndZoom?: boolean;
      colorProfiles?: string[];
      supportedRegionsAndCultures?: string[];
      defaultRegionAndCulture?: string;
      preventMultitouch?: boolean;
      interruptMultitouch?: boolean;
    };
    chipperSupportsOutputJSGruntTasks?: boolean;
  };
};

// TODO: output and consume this
export type BuildInfoJSON = {
  name: string; // name of the "repo"/sim
  version: string; // SimVersion-compatible string
  date: string; // ISO8601
  totalitySHA: string; // main totality commit
  babelSHA: string; // since we check out babel separately, we'll record the SHA of the babel repo here
  dependencyDirectories: string[]; // e.g. [ <sim-repo>, 'scenery', 'sun', ... ]
};