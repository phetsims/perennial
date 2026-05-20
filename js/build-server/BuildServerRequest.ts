// Copyright 2026, University of Colorado Boulder

/**
 * Types for a build server request.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { LegacyBranch, Repo, SHA } from '../browser-and-node/PerennialTypes.js';

export type BuildServerRequest = {
  api: '3.0';
  simName: Repo;
  version: string;
  locales: string[] | '*'; // TODO: oh my, what did the build server support?
  servers: string[];
  brands: string[];
  branch: LegacyBranch;
  totalitySHA: SHA;
  authorizationCode: string;
  email?: string;
};