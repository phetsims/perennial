// Copyright 2026, University of Colorado Boulder

/**
 * Removes redundant type annotations on callback parameters and return types in TypeScript files.
 * Targets arrow functions and function expressions that are passed as arguments to a CallExpression
 * (i.e. callbacks), since TypeScript contextually types those from the call signature. For each
 * candidate annotation the script removes it, runs `grunt type-check`, and reverts on failure.
 *
 * Complements `@typescript-eslint/no-inferrable-types`, which only catches trivial variable
 * initializers and does not flag callback parameter / return type annotations.
 *
 * Mirrors the structure of restrictAccessModifiers.ts and restrictReadonlyModifiers.ts.
 *
 * Usage (from the totality monorepo root):
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/removeInferrableTypes.ts <repo-directory>
 *
 * Example:
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/removeInferrableTypes.ts quantum-wave-interference
 *
 * <repo-directory> is the repo's directory name relative to the totality root (e.g.
 * `quantum-wave-interference`). It must contain a `tsconfig.json`.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { execSync } from 'child_process';
import path from 'path';
import { ArrowFunction, FunctionExpression, Node, ParameterDeclaration, Project } from 'ts-morph';

// Type-checking is invoked the same way `_totality/scripts/grunt.mts` does it: run `grunt`
// from the chipper directory (which has a local grunt install) and pass `--repo=<repo>`.
// Resolving CHIPPER from this source file makes the script independent of process cwd.
const CHIPPER = path.resolve( __dirname, '..', '..', '..', 'chipper' );

type Candidate =
  | { kind: 'param'; param: ParameterDeclaration; originalText: string }
  | { kind: 'return'; fn: ArrowFunction | FunctionExpression; originalText: string };

async function removeInferrableTypes( repoPath: string ): Promise<void> {

  const project = new Project( {
    tsConfigFilePath: `${repoPath}/tsconfig.json`
  } );

  const sourceFiles = project.getSourceFiles( `${repoPath}/js/**/*.ts` );
  console.log( `Found ${sourceFiles.length} source file(s) under ${repoPath}/js/**/*.ts` );

  // Sanity check: baseline must be green, otherwise every revert decision is meaningless.
  console.log( 'Baseline type-check...' );
  if ( !isBuildSuccessful( repoPath ) ) {
    console.error( 'ERROR: Baseline `grunt type-check` failed in ' + repoPath + '. Fix existing type errors before running this script.' );
    process.exit( 1 );
  }
  console.log( 'Baseline OK.' );

  let totalCandidates = 0;
  let totalRemoved = 0;
  let totalReverted = 0;

  for ( const sourceFile of sourceFiles ) {

    // Collect all callback functions in this file (arrow / function expression passed as an
    // argument to a CallExpression OR NewExpression — the latter matters because PhET code
    // is full of `new DerivedProperty([...], cb)`, `new Multilink([...], cb)`, etc.).
    const callbackFns: ( ArrowFunction | FunctionExpression )[] = [];
    sourceFile.forEachDescendant( node => {
      if ( Node.isArrowFunction( node ) || Node.isFunctionExpression( node ) ) {
        const parent = node.getParent();
        if ( parent && ( Node.isCallExpression( parent ) || Node.isNewExpression( parent ) )
             && parent.getArguments().includes( node ) ) {
          callbackFns.push( node );
        }
      }
    } );

    // Collect candidate annotations from those callbacks. Skip the literal `any` type
    // (removal would change semantics). Note: type aliases like `IntentionalAny` are NOT
    // skipped — those are still candidates.
    const candidates: Candidate[] = [];
    for ( const fn of callbackFns ) {
      for ( const param of fn.getParameters() ) {
        const typeNode = param.getTypeNode();
        if ( typeNode && typeNode.getText() !== 'any' ) {
          candidates.push( { kind: 'param', param: param, originalText: typeNode.getText() } );
        }
      }
      const returnTypeNode = fn.getReturnTypeNode();
      if ( returnTypeNode && returnTypeNode.getText() !== 'any' ) {
        candidates.push( { kind: 'return', fn: fn, originalText: returnTypeNode.getText() } );
      }
    }

    console.log( `# ${sourceFile.getFilePath()} — ${callbackFns.length} callback fn(s), ${candidates.length} candidate(s)` );
    if ( candidates.length === 0 ) {
      continue;
    }
    totalCandidates += candidates.length;

    for ( const candidate of candidates ) {
      const label = candidate.kind === 'param'
                    ? `param '${candidate.param.getName()}: ${candidate.originalText}'`
                    : `return type ': ${candidate.originalText}'`;
      console.log( `  - Trying to remove ${label}` );

      if ( candidate.kind === 'param' ) {
        candidate.param.removeType();
      }
      else {
        candidate.fn.removeReturnType();
      }
      await sourceFile.save();

      if ( isBuildSuccessful( repoPath ) ) {
        console.log( '    Removed.' );
        totalRemoved++;
      }
      else {
        if ( candidate.kind === 'param' ) {
          candidate.param.setType( candidate.originalText );
        }
        else {
          candidate.fn.setReturnType( candidate.originalText );
        }
        await sourceFile.save();
        console.log( '    Reverted (type-check failed).' );
        totalReverted++;
      }
    }
  }

  console.log( `\nSummary: ${totalCandidates} candidate(s), ${totalRemoved} removed, ${totalReverted} reverted.` );
}

if ( process.argv.includes( '--help' ) ) {
  console.log( `
\x1b[1mUsage (run from the totality monorepo root):\x1b[0m
  \x1b[36mbash perennial-alias/bin/sage run perennial-alias/js/scripts/removeInferrableTypes.ts <repo-directory>\x1b[0m

\x1b[1mParameters:\x1b[0m
  \x1b[33m<repo-directory>\x1b[0m - The repo directory name (relative to the totality root) whose
                       TypeScript files should be processed. Must contain a 'tsconfig.json'.

\x1b[1mOptions:\x1b[0m
  \x1b[32m--help\x1b[0m                  - Displays this help message and exits.

\x1b[1mExample:\x1b[0m
  \x1b[36mbash perennial-alias/bin/sage run perennial-alias/js/scripts/removeInferrableTypes.ts quantum-wave-interference\x1b[0m

\x1b[1mNote:\x1b[0m
- Only callback parameters/return types (arrow / function expressions passed as CallExpression
  arguments) are considered. Standalone functions and class methods are not touched.
- Annotations of type 'any' are skipped because removing them would change inference.
- The script edits files in place. Run with a clean working copy so you can review the diff.
  ` );
  process.exit( 0 );
}

if ( process.argv.length < 3 ) {
  console.error( 'Error: Please provide the path to the repository directory. Check --help for instructions.' );
  process.exit( 1 );
}

const repoPath = process.argv[ 2 ];

/**
 * Check if the proposed change (already saved to the filesystem) passes the type checker.
 */
function isBuildSuccessful( repoPath: string ): boolean {
  try {

    // Use gruntCommand.js so this works on Windows (grunt.cmd) as well as macOS/Linux (grunt).
    const gruntCommand = require( '../../../perennial-alias/js/common/gruntCommand.js' );
    const result = execSync( `${gruntCommand} type-check --repo=${repoPath}`, {
      cwd: CHIPPER,
      stdio: 'pipe',
      encoding: 'utf-8'
    } );
    if ( result.toLowerCase().includes( 'error' ) ) {
      return false;
    }
    return true;
  }
  catch( error ) {
    return false;
  }
}

removeInferrableTypes( repoPath )
  .then( () => console.log( 'Finished processing files.' ) )
  .catch( error => {
    console.error( 'An error occurred:', error );
    process.exit( 1 );
  } );
