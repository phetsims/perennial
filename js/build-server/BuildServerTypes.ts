// Copyright 2026, University of Colorado Boulder

/**
 * Types for a build server request.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { BuildServerTarget, LegacyBranch, LocalesStringSpecifier, Repo, SHA, VersionString } from '../browser-and-node/PerennialTypes.js';

// Dropping support for 1.0 and 2.0 since we need to work off of totality. Will be able to or (|) to add future versions
export type SupportedBuildServerVersion = '3.0';
export type SupportedBuildServerBrand = 'phet' | 'phet-io';

export type BuildServerTask = {
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

  ////// Internally-set options during tracking (persistentQueue)
  enqueueTime?: string;
  startTime?: string;
};

export type BuildServerRequest3_0 = {
  api: '3.0';
  authorizationCode: string;
} & Pick<BuildServerTask, 'simName' | 'totalitySHA' | 'versionString' | 'locales' | 'servers' | 'brands' | 'legacyBranch' | 'email'>;

// Will be able to or (|) in future versions
export type BuildServerRequest = BuildServerRequest3_0;
