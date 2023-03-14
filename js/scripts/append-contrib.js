// Copyright 2023, University of Colorado Boulder

/* eslint-disable default-import-match-filename */


/**
 * Append a note about contributing and a link to the contributing
 * doc in this repo to core common repos then commit. This script
 * is meant to be run from the root of the PhET project directory.
 *
 * @author Liam Mulhall <liammulh@gmail.com>
 */

import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { cwd, chdir } from 'node:process';
import appendToFile from './append-to-file.js';
import coreCommonRepos from './core-common-repos.js';

const contributingNote = `### Contributing
If you would like to contribute to this repo, please read our [contributing guidelines](https://github.com/phetsims/community/blob/master/CONTRIBUTING.md).
`;

for ( const repo of coreCommonRepos ) {
  console.log( '=======================================' );
  console.log( `appending contrib note to ${repo}` );
  appendToFile( join( repo, 'README.md' ), '\n\n' + contributingNote );
  const repoDir = join( cwd(), repo );
  console.log( `changing directory to ${repoDir}` );
  chdir( repoDir );
  const commitMessage = '"automated commit from phetsims/community; adding contrib doc note"';
  const commands = [
    'git pull origin master',
    'git add README.md',
    `git commit --message ${commitMessage} --no-verify`,
    'git push origin master'
  ];
  for ( const command of commands ) {
    console.log( `executing command: ${command}` );
    execSync( command );
  }
  console.log( 'going back one directory' );
  chdir( '..' );
}