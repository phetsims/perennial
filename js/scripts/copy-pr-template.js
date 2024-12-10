// Copyright 2023, University of Colorado Boulder

/**
 * Copy the pull request template to the core set of common repos.
 * This script is meant to be run in the root of the PhET project
 * directory.
 *
 * @author Liam Mulhall <liammulh@gmail.com>
 */

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chdir, cwd } from 'node:process';

import coreCommonRepos from './core-common-repos.js';

const pathToPrTemplate = join( cwd(), 'community', '.github', 'pull_request_template.md' );

for ( const repo of coreCommonRepos ) {
  const dest = join( cwd(), repo, '.github', 'pull_request_template.md' );
  const destDir = dirname( dest );
  const destDirDoesNotExist = !existsSync( destDir );
  if ( destDirDoesNotExist ) {
    mkdirSync( destDir, { recursive: true } );
  }
  copyFileSync( pathToPrTemplate, dest );
  chdir( repo );
  const commitMessage = '"automated commit from phetsims/community; adding PR template, see https://github.com/phetsims/community/issues/9"';
  const commands = [
    'git pull origin main',
    'git add .github',
    `git commit --message ${commitMessage} --no-verify`,
    'git push origin main'
  ];
  for ( const command of commands ) {
    console.log( `executing command: ${command}` );
    execSync( command );
  }
  console.log( 'going back one directory' );
  chdir( '..' );
}