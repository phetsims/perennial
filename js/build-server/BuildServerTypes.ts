// Copyright 2026, University of Colorado Boulder

/**
 * Types for a build server request.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { BuildServerTarget, LegacyBranch, LocalesStringSpecifier, Repo, SHA } from '../browser-and-node/PerennialTypes.js';

// Dropping support for 1.0 and 2.0 since we need to work off of totality. Will be able to or (|) to add future versions
export type SupportedBuildServerVersion = '3.0';
export type SupportedBuildServerBrand = 'phet' | 'phet-io';

// TODO: clean all of this up https://github.com/phetsims/totality/issues/140

export type BuildServerTask = {
  api: SupportedBuildServerVersion;

  // '*' or comma separated list of locale codes
  locales: LocalesStringSpecifier;

  // lower case simulation name used for creating files/directories
  simName: Repo;

  legacyBranch: LegacyBranch;

  totalitySHA: SHA;

  // sim version identifier string
  version: string; // TODO: versionString https://github.com/phetsims/totality/issues/140

  // deployment targets, subset of [ 'dev', 'production' ]
  servers: BuildServerTarget[];

  // deployment brands
  brands: SupportedBuildServerBrand[];

  // used for sending notifications about success/failure
  email?: string;

  // rosetta user id for adding translators to the website
  // TODO what type is this actually? https://github.com/phetsims/totality/issues/140
  userId?: string;

  // If true, this will presumably(?) just deploy images and do nothing else.
  deployImages?: boolean;
};

export type BuildServerRequest3_0 = {
  api: '3.0';
  authorizationCode: string;
} & Pick<BuildServerTask, 'simName' | 'totalitySHA' | 'version' | 'locales' | 'servers' | 'brands' | 'legacyBranch' | 'email'>;

// Will be able to or (|) in future versions
export type BuildServerRequest = BuildServerRequest3_0;
