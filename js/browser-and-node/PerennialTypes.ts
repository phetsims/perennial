// Copyright 2024, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

// TODO: move launchpad to these types https://github.com/phetsims/totality/issues/140
export type Repo = string;
export type SHA = string;
// TODO: use these types where possible https://github.com/phetsims/totality/issues/140
export type Branch = string; // for release branches or otherwise, should always be a fully-qualified branch name, e.g. 'releases/acid-base-solutions/1.3'
export type LegacyBranch = string; // for release branches, e.g. '1.2'
export type BranchOrSHA = Branch | SHA; // for cases where we can allow either

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
    ignoreForAutomatedMaintenanceReleases?: boolean;
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

      // Potentially older variants that we need to parse out
      supportsDescription?: boolean; // @deprecated
    };
    chipperSupportsOutputJSGruntTasks?: boolean;

    // Potentially older variants that we need to parse out
    supportsInteractiveDescriptions?: boolean; // @deprecated
    supportsInteractiveDescription?: boolean; // @deprecated
    accessible?: boolean; // @deprecated
  };
};

// TODO: output and consume this https://github.com/phetsims/totality/issues/140
export type BuildInfoJSON = {
  name: string; // name of the "repo"/sim
  version: string; // SimVersion-compatible string
  date: string; // ISO8601
  totalitySHA: string; // main totality commit
  babelSHA: string; // since we check out babel separately, we'll record the SHA of the babel repo here
  dependencyDirectories: string[]; // e.g. [ <sim-repo>, 'scenery', 'sun', ... ]
};