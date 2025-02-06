/* eslint-disable */
// @ts-nocheck
// rewrite_imports.ts
//
// Usage:
//   deno run --allow-read --allow-write rewrite_imports.ts <repo>
// Example:
//   deno run --allow-read --allow-write rewrite_imports.ts my-repo
//
// This will load ../my-repo/tsconfig.json, parse ../my-repo/js/**/*.js,
// find any imports ending with "import.js", parse those files, and rewrite
// the imports to point directly to their underlying modules.

import * as path from 'https://deno.land/std@0.192.0/path/mod.ts';
import { Project, SourceFile } from 'npm:ts-morph@21.0.1';

interface ReExportInfo {
  isDefault: boolean;
  localName: string;
  originalExportName: string;
  sourcePath: string;
}

/**
 * Parse the given import.js file (on-the-fly) to discover what each symbol re-exports.
 * Returns an array of ReExportInfo for all named exports. (Ignores star/namespace exports.)
 */
function parseImportJsFile( importJsPath: string ): ReExportInfo[] {
  const project = new Project( { useInMemoryFileSystem: true } );
  // We'll read the file contents from disk using Deno
  const fileContents = Deno.readTextFileSync( importJsPath );

  // Add it to an in-memory ts-morph Project
  const sourceFile = project.createSourceFile( importJsPath, fileContents );

  const results: ReExportInfo[] = [];

  // Look at all "export { ... } from '...';" declarations
  for ( const exportDecl of sourceFile.getExportDeclarations() ) {
    const modSpec = exportDecl.getModuleSpecifierValue();
    if ( !modSpec ) {
      continue;
    } // e.g., "export { foo }" with no from -> skip

    for ( const spec of exportDecl.getNamedExports() ) {
      const originalName = spec.getName(); // e.g. "default" or "Something"
      const alias = spec.getAliasNode()?.getText() || '';
      const localName = alias || originalName;

      results.push( {
        isDefault: ( originalName === 'default' ),
        localName,
        originalExportName: originalName,
        sourcePath: modSpec
      } );
    }
  }

  return results;
}

function addDirectivesInFile( sourceFile: SourceFile ) {

  // 1) Grab the file's content as a string, split it by lines
  const text = sourceFile.getFullText();
  const lines = text.split( '\n' );

  // 2) Loop through each line
  for ( let i = 0; i < lines.length; i++ ) {
    // Trim just for the quick match check
    const trimmed = lines[ i ].trim();

    // This simple pattern looks for:
    //   import <anything> from 'some/path/import.js'
    //   import <anything> from "some/path/import.js"
    //   with optional semicolon at the end
    // If your project sometimes uses "imports.js", you can tweak the pattern likewise.
    if ( trimmed.includes( 'import' ) && trimmed.endsWith( 'imports.js\';' ) ) {

      console.log( 'found' )

      // Insert a line above it. Then move our index
      lines.splice( i, 0, '\'PLEASE_IMPORT_DIRECTLY\';' );
      // We inserted a new line at index i. That means
      //   the `import` line now lives at i+1.
      // We'll increment i to skip re-checking that same import line
      i += 1;
    }
  }

  // 3) Rejoin and replace the source text
  sourceFile.replaceWithText( lines.join( '\n' ) );

  // 4) Save
  sourceFile.saveSync(); // or save() if async
  console.log( `Added directives in ${sourceFile.getFilePath()}` );
}

function removeDirectivesInFile( sourceFile: SourceFile ) {

  // 1) Grab the file's content as a string, split it by lines
  const text = sourceFile.getFullText();
  let lines = text.split( '\n' );

  // delete any line that contains 'PLEASE_IMPORT_DIRECTLY'
  lines = lines.filter( line => !line.includes( 'PLEASE_IMPORT_DIRECTLY' ) );

  // 3) Rejoin and replace the source text
  sourceFile.replaceWithText( lines.join( '\n' ) );

  // 4) Save
  sourceFile.saveSync(); // or save() if async
  console.log( `Added directives in ${sourceFile.getFilePath()}` );
}


function rewriteImportsInFile( sourceFile: SourceFile ) {
  console.log( `Processing ${sourceFile.getFilePath()}` );

  // Gather import declarations
  const importDecls = sourceFile.getImportDeclarations();
  for ( const importDecl of importDecls ) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if ( !moduleSpecifier || !moduleSpecifier.endsWith( 'imports.js' ) ) {
      continue;
    }

    console.log( `Rewriting import: ${moduleSpecifier}` );

    const sourceFileDir = path.dirname( sourceFile.getFilePath() );
    const absoluteImportJsPathJSJS = path.resolve( sourceFileDir, moduleSpecifier );
    const absoluteImportJsPath = absoluteImportJsPathJSJS.replace( /\.js$/, '.ts' );

    try {
      Deno.statSync( absoluteImportJsPath );
    }
    catch {
      console.warn( `File not found: ${absoluteImportJsPath}` );
      continue;
    }

    // Parse the re-exports from the import.js file
    const reExports = parseImportJsFile( absoluteImportJsPath );
    const namedImports = importDecl.getNamedImports();

    // Collect all lines of new import statements for this particular import declaration
    const newLines: string[] = [];

    for ( const namedImport of namedImports ) {
      const name = namedImport.getName();
      const alias = namedImport.getAliasNode()?.getText() || '';
      const localName = alias || name;

      const match = reExports.find( e => e.localName === name );
      if ( !match ) {
        console.warn( `Symbol "${name}" not found in ${absoluteImportJsPath}. Skipping.` );
        continue;
      }

      const targetAbsolutePath = path.resolve(
        path.dirname( absoluteImportJsPath ),
        match.sourcePath
      );
      let relativePath = path.relative( sourceFileDir, targetAbsolutePath );
      if ( !relativePath.startsWith( '.' ) ) {
        relativePath = './' + relativePath;
      }

      if ( match.isDefault ) {
        // e.g. import localName from '...';
        newLines.push( `import ${localName} from '${relativePath}';` );
      }
      else {
        // e.g. import { originalExportName as localName } from '...';
        if ( match.originalExportName === localName ) {
          newLines.push( `import { ${localName} } from '${relativePath}';` );
        }
        else {
          newLines.push( `import { ${match.originalExportName} as ${localName} } from '${relativePath}';` );
        }
      }
    }

    // Replace the *old* single import declaration with the new multi-line import text
    if ( newLines.length > 0 ) {
      importDecl.replaceWithText( newLines.join( '\n' ) );
    }
  }
}

/**
 * Main entry point:
 * - Read <repo> from Deno.args[0]
 * - Create a Project from ../<repo>/tsconfig.json
 * - Add all .js files in ../<repo>/js/
 * - For each file, rewrite imports ending with 'import.js'
 * - Save
 */
async function main() {
  if ( Deno.args.length < 1 ) {
    console.error( 'Usage: deno run --allow-read --allow-write rewrite_imports.ts <repo>' );
    Deno.exit( 1 );
  }

  const repo = Deno.args[ 0 ];
  const tsConfigPath = path.resolve( '..', repo, 'tsconfig.json' );

  const project = new Project( {
    tsConfigFilePath: tsConfigPath
  } );

  // Add only .js files in ../<repo>/js/ subfolders
  project.addSourceFilesAtPaths( path.join( '..', repo, 'js', '**', '*.js' ) );

  // Process each file
  const sourceFiles = project.getSourceFiles();
  for ( const sf of sourceFiles ) {
    if ( sf.getFilePath().includes( `/${repo}/` ) ) {

      if ( Deno.args.includes( '--phase1' ) ) {
        addDirectivesInFile( sf );
      }

      if ( Deno.args.includes( '--phase2' ) ) {
        rewriteImportsInFile( sf );
      }

      if ( Deno.args.includes( '--phase3' ) ) {
        removeDirectivesInFile( sf );
      }


    }
  }

  // Save
  await project.save();
  console.log( 'Done rewriting imports ending with import.js' );
}

if ( import.meta.main ) {
  await main();
}