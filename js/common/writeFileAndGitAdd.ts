// Copyright 2022, University of Colorado Boulder

/**
 * Writes a file with grunt and adds it to git.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

import fs from 'fs';
import grunt from '../npm-dependencies/grunt.js';
import { fixEOL } from './fixEOL.js';
import { gitIsClean } from './git/gitIsClean.js';
import { gitAdd } from './git/gitAdd.js';

export const writeFileAndGitAdd = async ( relativeFile: string, content: string ): Promise<void> => {

  const fixedContent = fixEOL( content );

  let writeFile = true;
  if ( fs.existsSync( `../${relativeFile}` ) ) {
    const fromDiskContent = fixEOL( fs.readFileSync( `../${relativeFile}`, 'utf8' ) );

    if ( fromDiskContent.trim() === fixedContent.trim() ) {
      writeFile = false;
    }
  }

  if ( writeFile ) {

    const outputFile = `../${relativeFile}`;
    grunt.file.write( outputFile, fixedContent );

    const fileClean = await gitIsClean( relativeFile );
    if ( !fileClean ) {
      await gitAdd( relativeFile );
    }
  }
};
