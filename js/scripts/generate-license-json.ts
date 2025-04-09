// Copyright 2023, University of Colorado Boulder
// @author Sam Reid (PhET Interactive Simulations)

/**
 * Generate a license.json file for a directory of files. This script reads the contents of a specified directory,
 * and creates a license.json file that includes the copyright year, project URL, license information, and any
 * additional notes provided.
 *
 * SAMPLE USAGE:
 * cd membrane-transport/
 * sage run ../perennial-alias/js/scripts/generate-license-json.ts ./sounds/ "created by Ashton Morris (PhET Interactive Simulations)"
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import fs from 'fs';
import path from 'path';

// Process command-line arguments
if ( process.argv.length < 4 ) {
  console.error( 'Usage: node generate-license-json.js <directory> <notes>' );
  process.exit( 1 );
}

const targetDir = process.argv[ 2 ];
const notes = process.argv[ 3 ];
const outputFilename = 'license.json';
const currentYear = new Date().getFullYear();

// Read the directory contents
fs.readdir( targetDir, ( err, files ) => {
  if ( err ) {
    console.error( 'Error reading directory:', err );
    process.exit( 1 );
  }

  // Filter out license.json and the macOS file (.DS_Store)
  const filteredFiles = files.filter( file =>
    file !== outputFilename && file !== '.DS_Store'
  );

  // Build up the license entries for each file
  const licenseEntries: Record<string, object> = {};
  filteredFiles.forEach( file => {
    licenseEntries[ file ] = {
      text: [ `Copyright ${currentYear} University of Colorado Boulder` ],
      projectURL: 'https://phet.colorado.edu',
      license: 'contact phethelp@colorado.edu',
      notes: notes
    };
  } );

  // Write the license.json file in the target directory
  const outputPath = path.join( targetDir, outputFilename );
  fs.writeFile( outputPath, JSON.stringify( licenseEntries, null, 2 ), 'utf8', ( err: unknown ) => {
    if ( err ) {
      console.error( 'Error writing license.json:', err );
      process.exit( 1 );
    }
    console.log( 'license.json created successfully at', outputPath );
  } );
} );