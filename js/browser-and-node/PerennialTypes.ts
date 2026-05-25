// Copyright 2024, University of Colorado Boulder
/**
 * Collection of usable types for build tools
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

export type Sim = string; // "acid-base-solutions" -- a simulation name
export type Runnable = string; // "joist" -- a runnable package (has a <runnable>_en.html and can by built/deployed)
export type Package = string; // "scenery" -- has code and a package.json
export type Directory = string; // e.g. "qa" -- a top-level directory in totality

export type NonTotalityRepo = string;
// TODO: new perennial data lists, https://github.com/phetsims/totality/issues/140

// @deprecated TODO: remove usages of this and rename things https://github.com/phetsims/totality/issues/140
export type Repo = string;

export type SHA = string;

export type Branch = string; // for release branches or otherwise, should always be a fully-qualified totality branch name, e.g. 'releases/acid-base-solutions/1.3'

export type BranchVersion = string; // for release branches, e.g. '1.3' or '1.3-phetio'

// @deprecated TODO: replace with BranchVersion https://github.com/phetsims/totality/issues/140
export type LegacyBranch = string; // for release branches, e.g. '1.3' or '1.3-phetio'

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

// Dropping support for 1.0 and 2.0 since we need to work off of totality. Will be able to or (|) to add future versions
export type SupportedBuildServerVersion = '3.0';
export type SupportedBuildServerBrand = 'phet' | 'phet-io';

// TODO: create BuildServerAPIData that requests and tasks can pick out, move SimTask to build-server https://github.com/phetsims/totality/issues/140
export type BuildServerSimTask = {
  type: 'sim';

  api: SupportedBuildServerVersion;

  // lower case simulation name used for creating files/directories
  simName: Repo;

  // sim version identifier string
  versionString: VersionString;

  legacyBranch: LegacyBranch;

  // '*' or comma separated list of locale codes
  locales: LocalesStringSpecifier;

  totalitySHA: SHA;

  // deployment targets, subset of [ 'dev', 'production' ]
  servers: BuildServerTarget[];

  // deployment brands
  brands: SupportedBuildServerBrand[];

  // used for sending notifications about success/failure
  email?: string;

  // rosetta user id for adding translators to the websiteg
  userId?: string;

  // If true, this will presumably(?) just deploy images and do nothing else.
  deployImages?: boolean;
};

export type BuildServerDeployImagesTask = {
  type: 'deployImages';

  simName?: Repo;
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
} & Pick<BuildServerSimTask, 'simName' | 'totalitySHA' | 'versionString' | 'locales' | 'servers' | 'brands' | 'legacyBranch' | 'email' | 'userId' | 'deployImages'>;

// Will be able to or (|) in future versions
export type BuildServerRequest = BuildServerRequest3_0;
