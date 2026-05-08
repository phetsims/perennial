// Copyright 2023-2026, University of Colorado Boulder

/**
 * git pull the specified path. Needs to work for repos relative to this copy of
 * perennial, AND in ../release-branches/REPO-VERSION/REPO/
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import execute from './execute';
import winston from 'winston';

/**
 * Executes git pull
 *
 * @param directory
 * @returns Stdout
 * @rejects {ExecuteError}
 */
export const gitPullDirectory = async ( directory: string ): Promise<string> => {
  winston.info( `git pull in ${directory}` );

  return execute( 'git', [ 'pull' ], directory );
};
