// Copyright 2022, University of Colorado Boulder

/**
 * Writes a file with grunt and adds it to git.
 *
 * TODO: Rename preserving history, see https://github.com/phetsims/chipper/issues/1624
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

import fs from 'fs';
import grunt from '../npm-dependencies/grunt.js';
import fixEOL from './fixEOL.js';
import gitAdd from './gitAdd.js';
import gitIsClean from './gitIsClean.js';
import isGitRepo from './isGitRepo.js';

/**
 * @param repo - The repository name
 * @param filePath - File name and potentially path relative to the repo
 * @param content - The content of the file as a string
 * @param [skipWorkIfUnchanged=false] - If true, the file will not be written and gitAdd will be skipped if the content is identical to the existing file.
 * @returns - stdout
 * @rejects {ExecuteError}
 */
export default async function( repo: string, filePath: string, content: string ): Promise<void> {

  const fixedContent = fixEOL( content );

  // TODO: https://github.com/phetsims/chipper/issues/1624 double check on windows after push
  const fromDiskContent = fixEOL( fs.readFileSync( `../${repo}/${filePath}`, 'utf8' ) );

  if ( fromDiskContent.trim() !== fixedContent.trim() ) {

    const outputFile = `../${repo}/${filePath}`;
    grunt.file.write( outputFile, fixedContent );

    if ( await isGitRepo( repo ) ) {
      const fileClean = await gitIsClean( repo, filePath );
      if ( !fileClean ) {
        await gitAdd( repo, filePath );
      }
    }
    else {
      console.warn( `${repo} is not a git repository. Skipping gitAdd.` );
    }
  }
}