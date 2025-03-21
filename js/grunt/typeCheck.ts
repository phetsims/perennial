// Copyright 2024, University of Colorado Boulder
/**
 * Type checks *.ts files.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs from 'fs';
import _ from 'lodash';
import os from 'os';
import path from 'path';
import { Repo } from '../browser-and-node/PerennialTypes.js';
import execute from '../common/execute.js';
import fixEOL from '../common/fixEOL.js';
import { PERENNIAL_ROOT } from '../common/perennialRepoUtils.js';

const ALL_CONFIG_PATH = `${PERENNIAL_ROOT}/../chipper/dist/tsconfig/all/`;
const tscCommand = `${PERENNIAL_ROOT}/node_modules/typescript/bin/tsc`;

export type CheckOptions = {

  // The repo to use as the entrypoint for type checking. The repo provided MUST have a tsconfig.json at the top level.
  repo: Repo;

  // Type check all supported repos in active-repos. Using this option ignore the "repo" option.
  all: boolean;

  // Run tsc -b --clean before type checking (basically a cache clear)
  clean: boolean;

  // Use good formatting/color output to the console. Always false if absolute:true
  pretty: boolean;

  // Prevent all output, even if verbose or absolute flags are set.
  silent: boolean;

  // When true, this will provide extra output from `tsc`. Always false if absolute:true
  verbose: boolean;

  /**
   * This mode supports special logging output to support hyperlinks in output when run inside a Webstorm external tool.
   * Most likely you will want to use this with --all.
   *
   * absolute:true will overwrite to pretty:false
   *
   * IMPORTANT!!! This makes the files paths clickable in Webstorm:
   * output filters: $FILE_PATH$\($LINE$\,$COLUMN$\)
   */
  absolute: boolean;
};

const typeCheck = async ( providedOptions?: Partial<CheckOptions> ): Promise<boolean> => {

  const options: CheckOptions = _.assignIn( {

    // Either repo or all must be provided. "all" will take precedent if both are provided
    repo: null,
    all: false,

    clean: false,

    pretty: true,
    silent: false,
    verbose: false,
    absolute: false
  }, providedOptions );

  assert( options.repo || options.all, 'You must provide a repo or use --all' );

  if ( options.absolute ) {
    options.pretty = false;
    options.verbose = false;
  }
  if ( options.silent ) {
    options.verbose = false;
    options.absolute = false;
  }

  if ( options.all ) {
    writeAllTSConfigFile();
  }

  const repoEntryPoint = getRepoCWD( options.repo );

  !options.all && options.repo && assert( fs.existsSync( `${repoEntryPoint}/tsconfig.json` ), `repo provided does not have a tsconfig.json: ${options.repo}` );

  const cwd = options.all ? ALL_CONFIG_PATH : repoEntryPoint;

  const startTime = Date.now();
  if ( options.clean ) {
    await tscClean( cwd );
  }

  const tscArgs = [
    tscCommand,
    '-b', // always, because we use project references.
    '--pretty', `${options.pretty}`
  ];
  if ( options.verbose ) {
    tscArgs.push( ...[
      '--verbose', 'true',
      '--traceResolution',
      '--extendedDiagnostics'
    ] );
  }
  const tscResults = await runCommand( 'node', tscArgs, cwd, options.absolute );

  options.absolute && handleAbsolute( tscResults.stdout, cwd, startTime );

  return tscResults.success;
};

function getRepoCWD( repo: string ): string {
  return `${PERENNIAL_ROOT}/../${repo}`;
}

async function tscClean( cwd: string ): Promise<void> {
  const cleanResults = await runCommand( 'node', [ tscCommand, '-b', '--clean' ], cwd, false );
  if ( !cleanResults.success ) {
    throw new Error( `Checking failed to clean, ${cleanResults.stderr}` );
  }
}

export async function tscCleanRepo( repo: string ): Promise<void> {
  return tscClean( getRepoCWD( repo ) );
}

// Utility function to execute with inherited stdio.
async function runCommand( command: string, args: string[], cwd: string, absolute: boolean ): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const options = {
    errors: 'resolve' as const,
    childProcessOptions: {}
  };
  if ( !absolute ) {
    options.childProcessOptions = {
      stdio: 'inherit'
    };
  }
  const result = await execute( command, args, cwd, options );
  return {
    success: result.code === 0,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

/**
 * Write an aggregate tsconfig file that checks all entry points.
 */
function writeAllTSConfigFile(): void {
  const activeRepos = fs.readFileSync( `${PERENNIAL_ROOT}/data/active-repos`, 'utf-8' ).trim().split( /\r?\n/ ).map( s => s.trim() );
  const activeSceneryStackRepos = fs.readFileSync( `${PERENNIAL_ROOT}/data/active-scenerystack-repos`, 'utf-8' ).trim().split( /\r?\n/ ).map( s => s.trim() );

  const filteredRepos = activeRepos.filter( repo => {
    // TODO: https://github.com/phetsims/aqua/issues/226
    if ( activeSceneryStackRepos.includes( repo ) ) {
      return false;
    }
    return fs.existsSync( `${PERENNIAL_ROOT}/../${repo}/tsconfig.json` ) &&
           repo !== 'phet-lib' && // TODO: include this repo, see https://github.com/phetsims/phet-lib/issues/7
           repo !== 'phet-vite-demo'; // TODO: include this repo, see https://github.com/phetsims/phet-vite-demo/issues/2
  } );

  const json = {
    references: filteredRepos.map( repo => ( { path: `../../../../${repo}` } ) )
  };

  const fileOutput = `/**
 * File auto-generated by check.ts 
 *
 * Explicitly list all entry points that we want to type-check.
 * Imported images/mipmaps/sounds are still type checked.
 * This structure was determined in https://github.com/phetsims/chipper/issues/1245
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */
${JSON.stringify( json, null, 2 )}`;

  fs.mkdirSync( ALL_CONFIG_PATH, { recursive: true } ); // Silent no-op if it already exists.
  fs.writeFileSync( ALL_CONFIG_PATH + 'tsconfig.json', fixEOL( fileOutput ) );
}

// This function supports special logging output to support hyperlinks in output when run inside a Webstorm external tool.
const handleAbsolute = ( stdout: string, cwd: string, startTime: number ) => {

  const lines = stdout.trim().split( os.EOL );
  const mappedToAbsolute = lines.map( line => {

    if ( line.includes( '): error TS' ) ) {
      const parenthesesIndex = line.indexOf( '(' );

      const linePath = line.substring( 0, parenthesesIndex );
      const resolved = path.resolve( cwd, linePath );
      return resolved + line.substring( parenthesesIndex );
    }
    else {
      return line;
    }
  } );

  // If a line starts without whitespace, it begins a new error
  const errorCount = mappedToAbsolute.filter( line => line.length > 0 && line === line.trim() ).length;

  console.log( mappedToAbsolute.join( '\n' ) );
  console.log( `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} in ${Date.now() - startTime}ms` );
};

export default typeCheck;