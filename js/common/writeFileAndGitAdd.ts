// Copyright 2022, University of Colorado Boulder

/**
 * Writes a file with grunt and adds it to git.
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
 * @returns - stdout
 * @rejects {ExecuteError}
 */
export default async function( repo: string, filePath: string, content: string ): Promise<void> {

  const fixedContent = fixEOL( content );

  let writeFile = true;
  if ( fs.existsSync( `../${repo}/${filePath}` ) ) {
    const fromDiskContent = fixEOL( fs.readFileSync( `../${repo}/${filePath}`, 'utf8' ) );

    if ( fromDiskContent.trim() === fixedContent.trim() ) {
      writeFile = false;
    }
  }

  if ( writeFile ) {

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