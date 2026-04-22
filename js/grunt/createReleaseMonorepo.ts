// Copyright 2026, University of Colorado Boulder

/**
 * Creates a release branch for a simulation in the totality monorepo.
 *
 * Creates a branch `releases/{repo}/{major}.{minor}` seeded from origin/main, pruned to the
 * transitive phetLibs for the given brands, with the sim's package.json bumped to {major}.{minor}.0-rc.0
 * and phet.supportedBrands set. Operates entirely in a git worktree so the primary checkout is untouched.
 *
 * See `grunt create-release-monorepo`. The rc.ts and build-server flows are deliberately
 * left out of this first slice and will be wired in follow-up tasks.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import SimVersion from '../browser-and-node/SimVersion.js';
import dirname from '../common/dirname.js';
import execute from '../common/execute.js';

// @ts-expect-error - until we have "type": "module" in our package.json
const __dirname = dirname( import.meta.url );

// perennial-alias/js/grunt/ → totality root is three levels up.
const TOTALITY_ROOT = path.resolve( __dirname, '../../../' );

export type CreateReleaseMonorepoOptions = {
  repo: string;
  branch: string;       // "{major}.{minor}" e.g. "1.7"
  brands: string[];     // e.g. [ 'phet' ] or [ 'phet', 'phet-io' ]
  message?: string;     // Optional freeform message appended to the commit message.
  skipPush?: boolean;   // If true, do everything locally but skip the push; leave the worktree for inspection.
  skipVersionBump?: boolean; // If true, skip bumping main's version to the next dev version.
};

// Tooling repos we always keep on a release branch, even if phetLibs wouldn't list them.
const ALWAYS_KEEP_REPOS = [ 'perennial-alias', 'chipper', '_totality' ];

// Babel is treated as a live translation database at build time, not a snapshot. Never commit it
// on a release branch; build-server pulls babel from its own main.
const ALWAYS_DROP_REPOS = [ 'babel' ];

/**
 * Computes the set of repo directories to keep on a release branch for the given sim + brands.
 * Reimplements the logic from chipper/js/grunt/getPhetLibs.ts because perennial cannot depend on chipper.
 */
function computeKeepRepos( repo: string, brands: string[] ): Set<string> {
  const packageObject = JSON.parse( fs.readFileSync( path.join( TOTALITY_ROOT, repo, 'package.json' ), 'utf8' ) );
  const buildObject = JSON.parse( fs.readFileSync( path.join( TOTALITY_ROOT, 'chipper', 'build.json' ), 'utf8' ) );

  const repos = new Set<string>();
  repos.add( repo );
  ALWAYS_KEEP_REPOS.forEach( r => repos.add( r ) );

  ( packageObject?.phet?.phetLibs ?? [] ).forEach( ( r: string ) => repos.add( r ) );
  ( buildObject.common?.phetLibs ?? [] ).forEach( ( r: string ) => repos.add( r ) );

  for ( const brand of brands ) {
    ( buildObject[ brand ]?.phetLibs ?? [] ).forEach( ( r: string ) => repos.add( r ) );
    ( packageObject?.phet?.[ brand ]?.phetLibs ?? [] ).forEach( ( r: string ) => repos.add( r ) );

    if ( brand === 'phet-io' ) {
      const wrappers: string[] = packageObject?.phet?.[ brand ]?.wrappers ?? [];
      wrappers.filter( w => !w.includes( '/' ) ).forEach( w => repos.add( w ) );
    }
  }

  ALWAYS_DROP_REPOS.forEach( r => repos.delete( r ) );

  return repos;
}

async function git( args: string[], cwd: string ): Promise<string> {
  return execute( 'git', args, cwd );
}

export default async function createReleaseMonorepo( options: CreateReleaseMonorepoOptions ): Promise<void> {
  const { repo, branch, brands, message, skipPush, skipVersionBump } = options;

  assert( /^\d+\.\d+$/.test( branch ), `Branch should be {{MAJOR}}.{{MINOR}}, got: ${branch}` );
  assert( Array.isArray( brands ) && brands.length >= 1, 'At least one brand required' );
  assert( fs.existsSync( path.join( TOTALITY_ROOT, repo, 'package.json' ) ), `Sim package.json not found: ${repo}/package.json` );

  const [ majorStr, minorStr ] = branch.split( '.' );
  const major = Number( majorStr );
  const minor = Number( minorStr );
  assert( major > 0, 'Major version must be > 0' );
  assert( minor >= 0, 'Minor version must be >= 0' );

  const releaseBranch = `releases/${repo}/${branch}`;
  const worktreePath = path.resolve( TOTALITY_ROOT, '..', `totality-${repo}-${branch.replace( '.', '_' )}` );
  const rcVersion = new SimVersion( major, minor, 0, { testType: 'rc', testNumber: 0 } );

  winston.info( `Creating release branch ${releaseBranch} for ${repo} with brands=[${brands.join( ',' )}]` );

  await git( [ 'fetch', '--quiet', 'origin' ], TOTALITY_ROOT );

  const remoteLs = await git( [ 'ls-remote', '--heads', 'origin', releaseBranch ], TOTALITY_ROOT );
  assert( remoteLs.trim().length === 0, `Remote branch already exists: ${releaseBranch}` );

  const localCheck = await execute( 'git', [ 'rev-parse', '--verify', '--quiet', `refs/heads/${releaseBranch}` ], TOTALITY_ROOT, { errors: 'resolve' } );
  assert( localCheck.code !== 0, `Local branch already exists: ${releaseBranch}. Delete it first or prune stale worktrees with 'git worktree prune'.` );

  assert( !fs.existsSync( worktreePath ), `Worktree path already exists: ${worktreePath}. Remove it first.` );

  const keepRepos = computeKeepRepos( repo, brands );
  winston.info( `Keep set (${keepRepos.size} repos): ${Array.from( keepRepos ).sort().join( ', ' )}` );

  winston.info( `Adding worktree at ${worktreePath} on branch ${releaseBranch} from origin/main` );
  await git( [ 'worktree', 'add', '-b', releaseBranch, worktreePath, 'origin/main' ], TOTALITY_ROOT );

  try {
    const rootEntries = fs.readdirSync( worktreePath, { withFileTypes: true } );
    let pruned = 0;
    for ( const entry of rootEntries ) {

      // Keep all files at the root (package.json, tsconfig.json, README, etc.), and keep hidden
      // entries like .git, .github, .gitignore untouched.
      if ( !entry.isDirectory() || entry.name.startsWith( '.' ) ) {
        continue;
      }
      if ( keepRepos.has( entry.name ) ) {
        continue;
      }
      fs.rmSync( path.join( worktreePath, entry.name ), { recursive: true, force: true } );
      pruned++;
    }
    winston.info( `Pruned ${pruned} directories` );

    const simPackagePath = path.join( worktreePath, repo, 'package.json' );
    const simPackage = JSON.parse( fs.readFileSync( simPackagePath, 'utf8' ) );
    simPackage.version = rcVersion.toString();
    simPackage.phet = simPackage.phet ?? {};
    simPackage.phet.supportedBrands = brands;
    fs.writeFileSync( simPackagePath, `${JSON.stringify( simPackage, null, 2 )}\n` );

    const simLockPath = path.join( worktreePath, repo, 'package-lock.json' );
    if ( fs.existsSync( simLockPath ) ) {
      const simLock = JSON.parse( fs.readFileSync( simLockPath, 'utf8' ) );
      simLock.version = rcVersion.toString();
      if ( simLock.packages && simLock.packages[ '' ] ) {
        simLock.packages[ '' ].version = rcVersion.toString();
      }
      fs.writeFileSync( simLockPath, `${JSON.stringify( simLock, null, 2 )}\n` );
    }

    await git( [ 'add', '-A' ], worktreePath );
    const commitMessage = `Create release branch ${releaseBranch} with brands=[${brands.join( ',' )}], version ${rcVersion.toString()}${message ? `, ${message}` : ''}`;
    await git( [ 'commit', '-m', commitMessage ], worktreePath );

    if ( skipPush ) {
      winston.info( [
        '--skip-push set: skipping remote push.',
        `Worktree left at: ${worktreePath}`,
        'To finish manually:',
        `  git -C ${worktreePath} push -u origin ${releaseBranch}`,
        `  git -C ${TOTALITY_ROOT} worktree remove ${worktreePath}`
      ].join( '\n' ) );
    }
    else {
      winston.info( `Pushing ${releaseBranch} to origin` );
      await git( [ 'push', '-u', 'origin', releaseBranch ], worktreePath );

      winston.info( `Removing worktree ${worktreePath}` );
      await git( [ 'worktree', 'remove', worktreePath ], TOTALITY_ROOT );
    }

    if ( !skipVersionBump ) {
      const currentBranch = ( await git( [ 'rev-parse', '--abbrev-ref', 'HEAD' ], TOTALITY_ROOT ) ).trim();
      assert( currentBranch === 'main', `Primary checkout must be on main to bump version, but is on: ${currentBranch}. Use --skip-version-bump to skip.` );

      const devVersion = new SimVersion( major, minor + 1, 0, { testType: 'dev', testNumber: 0 } );
      const mainPackagePath = path.join( TOTALITY_ROOT, repo, 'package.json' );
      const mainPackage = JSON.parse( fs.readFileSync( mainPackagePath, 'utf8' ) );
      mainPackage.version = devVersion.toString();
      fs.writeFileSync( mainPackagePath, `${JSON.stringify( mainPackage, null, 2 )}\n` );

      const mainLockPath = path.join( TOTALITY_ROOT, repo, 'package-lock.json' );
      if ( fs.existsSync( mainLockPath ) ) {
        const mainLock = JSON.parse( fs.readFileSync( mainLockPath, 'utf8' ) );
        mainLock.version = devVersion.toString();
        if ( mainLock.packages && mainLock.packages[ '' ] ) {
          mainLock.packages[ '' ].version = devVersion.toString();
        }
        fs.writeFileSync( mainLockPath, `${JSON.stringify( mainLock, null, 2 )}\n` );
      }

      winston.info( `Bumped ${repo} to ${devVersion.toString()} on main (not committed). Next steps:` );
      winston.info( `  1. Inspect changes in ${repo}/package.json` );
      winston.info( `  2. Run: npm run grunt -- update --repo=${repo}` );
      winston.info( '  3. Review, commit, and push main' );
    }

    winston.info( `Done. Release branch ${releaseBranch} created${skipPush ? ' (not pushed)' : ' and pushed'}.` );
  }
  catch( error ) {
    winston.error( `Failure during release creation. Worktree left in place for debugging: ${worktreePath}` );
    throw error;
  }
}
