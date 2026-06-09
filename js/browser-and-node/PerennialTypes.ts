// Copyright 2024-2026, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

export type Sim = string; // "acid-base-solutions" -- a simulation name
export type Runnable = string; // "joist" -- a runnable package (has a <runnable>_en.html and can by built/deployed)
export type Dependency = string; // "scenery" -- has code and a package.json
export type Directory = string; // e.g. "qa" -- a top-level directory in totality

export type NonTotalityRepo = string;
// TODO: new perennial data lists, https://github.com/phetsims/totality/issues/140

export type Repo = string; // NOTE: ONLY use this for actual repos (not directories in totality, etc.)
export type SHA = string;
export type Branch = string; // for release branches or otherwise, should always be a fully-qualified totality branch name, e.g. 'releases/acid-base-solutions/1.3'
export type BranchVersion = string; // for release branches, e.g. '1.3' or '1.3-phetio'
export type BranchOrSHA = Branch | SHA; // for cases where we can allow either

export type BuildServerTarget = 'dev' | 'production';
export type VersionString = string; // SimVersion-compatible string
export type FullStringKey = string; // including the require.js namespace, e.g. 'JOIST/foo.bar'
export type PartialStringKey = string; // not including the require.js namespace, e.g. 'foo.bar'
export type Locale = string;

export type LocalesStringSpecifier = '*' | string; // either '*', or a comma-separated list of locale codes, e.g. 'en,es,fr'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IntentionalPerennialAny = any;

export type StringMap = Record<Locale, Record<FullStringKey, string>>;
export type InversedStringMap = Record<FullStringKey, Record<Locale, string>>;

export type EnglishStringsJSONLeaf = {
  value: string;
  _comment?: string;
  deprecated?: true;
  simMetadata?: {
    phetioReadOnly?: boolean;
  };
};

export type EnglishStringsJSON = {
  [key: PartialStringKey]: EnglishStringsJSONLeaf | EnglishStringsJSON;
};

export type LocaleData = Record<Locale, {
  englishName: string;
  localizedName: string;
  direction: 'rtl' | 'ltr';
  bcp47: string;
  locale3?: string;
  fallbackLocales?: Locale[];
}>;

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

    // fully-qualified string keys for each screen name, so that the build-server/website can parse it out and use it
    screenNameKeys?: FullStringKey[];

    // the start of a fully-qualified string key for this repo, e.g. 'JOIST'.
    requirejsNamespace?: string;

    readmeCreatedManually?: boolean;

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

export type BuildInfoJSON = {
  name: string; // name of the "repo"/sim
  version: string; // SimVersion-compatible string
  date: string; // ISO8601
  totalitySHA: string; // main totality commit
  babelSHA: string; // since we check out babel separately, we'll record the SHA of the babel repo here
  dependencyDirectories: string[]; // e.g. [ <sim-repo>, 'scenery', 'sun', ... ]
};

// Dropping support for 1.0 and 2.0 since we need to work off of totality. Will be able to or (|) to add future versions
export type SupportedBuildServerVersion = '3.0';
export type SupportedBuildServerBrand = 'phet' | 'phet-io';

// Items common to both the build request API and internal sim-deployment task objects
export type BuildServerAPIData = {
  // lower case simulation name used for creating files/directories
  simName: Sim;

  // sim version identifier string
  versionString: VersionString;

  branchVersion: BranchVersion;

  // '*' or comma separated list of locale codes
  locales: LocalesStringSpecifier;

  totalitySHA: SHA;

  // deployment targets, subset of [ 'dev', 'production' ]
  servers: BuildServerTarget[];

  // deployment brands
  brands: SupportedBuildServerBrand[];

  // used for sending notifications about success/failure
  email?: string;

  // rosetta user id for adding translators to the website
  userId?: string;

  // If true, this will presumably(?) just deploy images and do nothing else.
  deployImages?: boolean;
};

export type BuildServerSimTask = {
  type: 'sim';
  api: SupportedBuildServerVersion;
} & BuildServerAPIData;

export type BuildServerDeployImagesTask = {
  type: 'deployImages';

  simName?: Sim;
  versionString?: VersionString;
};

export type BuildServerTask = {
  ////// Internally-set options during tracking (persistentQueue)
  enqueueTime?: string;
  startTime?: string;
} & ( BuildServerSimTask | BuildServerDeployImagesTask );

export type BuildServerRequest3_0 = {
  api: '3.0';
  authorizationCode: string;
} & BuildServerAPIData;

// Will be able to or (|) in future versions
export type BuildServerRequest = BuildServerRequest3_0;
