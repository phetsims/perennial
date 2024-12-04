// Copyright 2024, University of Colorado Boulder

/**
 * This script automates the process of enforcing the 'readonly' modifier on class properties within TypeScript files in a specified project.
 * It iterates over TypeScript files in the 'js/' directory, attempting to add the 'readonly' modifier to class properties that are not already readonly.
 * After each modification, it runs the TypeScript type checker to validate the change. If the type checker fails, it reverts the change.
 * This helps in ensuring that class properties are immutable where possible, enhancing code reliability and maintainability.
 *
 * Usage:
 * cd perennial-alias/
 * sage run js/scripts/enforceReadonlyModifiers.ts [relative-path-to-repo-directory]
 *
 * Parameters:
 * [relative-path-to-repo-directory] - The path to the repository where TypeScript files are located. This script assumes
 *                            a 'tsconfig.json' file is present at the root of the specified directory.
 *
 * Options:
 * --help                   - Displays this help message and exits.
 *
 * Example:
 * sage run js/scripts/enforceReadonlyModifiers.ts ../my-ts-project
 *
 * Note:
 * - Ensure that 'tsconfig.json' is correctly set up in your project root.
 * - The script currently targets files within the 'js/' directory by default. Adjust the glob pattern in the
 *   getSourceFiles method call if your project structure differs.
 * - This script requires Node.js and the 'ts-morph' and 'child_process' packages.
 * - The script makes changes to the repo as it progresses. If you look at the source files while this script is running
 *   you will see the changes being made to trial values.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { execSync } from 'child_process';
import { Project, PropertyDeclaration } from 'ts-morph';

/**
 * Function to enforce 'readonly' on class properties
 * @param repoPath - The path to the repository directory
 */
async function enforceReadonlyModifiers( repoPath: string ): Promise<void> {
  // Initialize a new ts-morph Project
  const project = new Project( {
    // Assuming tsconfig.json is in the root, adjust if necessary
    tsConfigFilePath: `${repoPath}/tsconfig.json`
    // Optionally add any additional compiler options or project settings here
  } );

  // Retrieve all TypeScript source files in the 'js/' directory
  const sourceFiles = project.getSourceFiles( `${repoPath}/js/**/*.ts` ); // Adjust the glob pattern as necessary

  for ( const sourceFile of sourceFiles ) {
    const classes = sourceFile.getClasses();

    for ( const classDeclaration of classes ) {
      const className = classDeclaration.getName() || '<Unnamed Class>';
      console.log( `# Processing class: ${className}` );

      // Retrieve all property declarations (both instance and static)
      const properties: PropertyDeclaration[] = classDeclaration.getProperties();

      for ( const property of properties ) {
        const propertyName = property.getName();
        const isReadonly = property.isReadonly();

        if ( isReadonly ) {
          console.log( `  - Property '${propertyName}' is already readonly. Skipping.` );
          continue;
        }

        console.log( `  - Attempting to set 'readonly' on property '${propertyName}'.` );

        // Add 'readonly' modifier
        property.setIsReadonly( true );
        await sourceFile.save();

        if ( isBuildSuccessful( repoPath ) ) {
          console.log( `    Successfully set 'readonly' on '${propertyName}'.` );
        }
        else {
          // Revert the change if the build fails
          property.setIsReadonly( false );
          await sourceFile.save();
          console.log( `    Failed to set 'readonly' on '${propertyName}'. Reverted the change.` );
        }
      }
    }
  }
}

// Check if there is a --help command line argument
if ( process.argv.includes( '--help' ) ) {
  console.log( `
\x1b[1mUsage:\x1b[0m
  \x1b[36mcd perennial-alias/\x1b[0m
  \x1b[36msage run js/scripts/enforceReadonlyModifiers.ts [relative-path-to-repo-directory]\x1b[0m

\x1b[1mParameters:\x1b[0m
  \x1b[33m[relative-path-to-repo-directory]\x1b[0m - The path to the repository where TypeScript files are located. Assumes
                           a 'tsconfig.json' file is present at the root of the specified directory.

\x1b[1mOptions:\x1b[0m
  \x1b[32m--help\x1b[0m                  - Displays this help message and exits.

\x1b[1mExample:\x1b[0m
  \x1b[36msage run js/scripts/enforceReadonlyModifiers.ts ../my-ts-project\x1b[0m

\x1b[1mNote:\x1b[0m
- Ensure that 'tsconfig.json' is correctly set up in your project root.
- The script currently targets files within the 'js/' directory by default. Adjust the glob pattern in the
  getSourceFiles method call if your project structure differs.
- This script requires Node.js and the 'ts-morph' and 'child_process' packages.
- The script makes changes to the repo as it progresses. If you look at the source files while this script 
  is running you will see the changes being made to trial values.
  ` );
  process.exit( 0 );
}

// Check if the path to the repository directory is provided
if ( process.argv.length < 3 ) {
  console.error( 'Error: Please provide the path to the repository directory. Check --help for instructions.' );
  process.exit( 1 );
}

// Set the path to the repository directory
const repoPath = process.argv[ 2 ];

/**
 * Check if the proposed change (already saved to the filesystem) passes the type checker.
 * @param repoPath - The path to the repository directory
 * @returns - True if the build is successful, else false
 */
function isBuildSuccessful( repoPath: string ): boolean {
  try {
    // Specify the path to the TypeScript compiler or build command you want to use
    const gruntCommand = require( '../../../perennial-alias/js/common/gruntCommand.js' );

    // Run the specified TypeScript compiler or build command in the current directory
    const result = execSync( `${gruntCommand} type-check`, {
      // set the working directory
      cwd: repoPath,
      stdio: 'pipe', // Capture the output
      encoding: 'utf-8'
    } );

    if ( result.toLowerCase().includes( 'error' ) ) {
      return false;
    }

    // If the build command exits without error, the build is successful
    return true;
  }
  catch( error ) {
    // If the build command exits with an error (non-zero exit code), the build failed
    return false;
  }
}

// Run the script
enforceReadonlyModifiers( repoPath )
  .then( () => console.log( 'Finished processing files.' ) )
  .catch( error => {
    console.error( 'An error occurred:', error );
    process.exit( 1 );
  } );