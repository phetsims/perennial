
// TODO: move launchpad to these types
export type SHA = string;
export type Branch = string;
export type Repo = string;

export type PackageJSON = {
  name: string;
  version: string;
  phet?: {
    runnable?: boolean;
    simulation?: boolean;
    generatedUnitTests?: boolean;
    supportsOutputJS?: boolean;
    requireJSNamespace?: string;
    'phet-io'?: {
      wrappers?: string[];
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