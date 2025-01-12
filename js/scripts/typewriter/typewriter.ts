// Copyright 2025, University of Colorado Boulder
/**
 * Automatic support for writing TypeScript types, type space information and basic JS=>TS conversions.
 *
 * Currently helps with instance method JSDoc and signature extraction.
 *
 * Follow these steps:
 * 1. Rename the file from *.js to *.ts
 * 2. Run this script
 * 3. Carefully review the changes
 * 4. Add imports as needed
 * 5. Use IDEA for formatting.
 * 6. Commit the result
 *
 * Usage:
 * cd perennial-alias/
 * sage run js/scripts/typewriter.ts [relative-path-to-file]
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { execSync } from 'node:child_process';
import { Project } from 'ts-morph';

async function visitFile( file: string ): Promise<void> {

  const repoPath = file.split( '/' ).slice( 0, 2 ).join( '/' );

  // Initialize a new ts-morph Project
  const project = new Project( {

    // Assuming tsconfig.json is in the root, adjust if necessary
    tsConfigFilePath: `${repoPath}/tsconfig.json`
  } );

  // const sourceFiles = project.getSourceFiles( `${repoPath}/js/**/*.ts` ); // Adjust the glob pattern as necessary
  const sourceFile = project.getSourceFile( file )!;

  const classes = sourceFile.getClasses();

  const combos = [];

  for ( const classDeclaration of classes ) {

    console.log( `# Enumerating class: ${classDeclaration.getName()}` );

    const members = [
      ...classDeclaration.getInstanceMethods()
      // ...classDeclaration.getStaticMethods()
    ];

    for ( const member of members ) {
      console.log( '\n\nenumerating: ', member.getName() );
      combos.push( { file: file, className: classDeclaration.getName()!, methodName: member.getName() } );
    }
  }
  console.log( 'Visiting combos: ', JSON.stringify( combos, null, 2 ) );

  for ( const combo of combos ) {

    // Run in a separate process, otherwise the Project will be corrupted and crash
    execSync( `sage run js/scripts/typewriter/visitInstanceMethod.ts ${combo.file} ${combo.className} ${combo.methodName}` );
  }
}

const pathFromCLIargs = process.argv[ 2 ];

// Run the script
visitFile( pathFromCLIargs ).then( () => console.log( 'Finished processing files.' ) );