// Copyright 2026, University of Colorado Boulder

/**
 * Reports how many properties of each constructor argument are used inside the constructor body.
 * This helps identify cases where a class receives a large object but only uses a few of its
 * properties — a sign that the constructor could accept those properties directly instead.
 *
 * Parameters named `options` or `providedOptions` are excluded from the analysis.
 *
 * Usage (from the totality monorepo root):
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts <repo-directory>
 *
 * Example:
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts quantum-wave-interference
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { Node, Project } from 'ts-morph';

type ParamReport = {
  paramName: string;
  paramType: string;
  properties: string[];
};

type ConstructorReport = {
  className: string;
  filePath: string;
  params: ParamReport[];
};

async function reportConstructorCoupling( repoPath: string ): Promise<void> {

  const project = new Project( {
    tsConfigFilePath: `${repoPath}/tsconfig.json`
  } );

  const sourceFiles = project.getSourceFiles( `${repoPath}/js/**/*.ts` );
  console.log( `Found ${sourceFiles.length} source file(s) under ${repoPath}/js/**/*.ts\n` );

  const reports: ConstructorReport[] = [];

  for ( const sourceFile of sourceFiles ) {
    const classes = sourceFile.getClasses();

    for ( const classDeclaration of classes ) {
      const constructor = classDeclaration.getConstructors()[ 0 ];
      if ( !constructor ) {
        continue;
      }

      const params = constructor.getParameters();
      const paramReports: ParamReport[] = [];

      for ( const param of params ) {
        const paramName = param.getName();

        // Skip options/providedOptions
        if ( paramName === 'options' || paramName === 'providedOptions' ) {
          continue;
        }

        const paramType = param.getType().getText( param );

        // Find all property access expressions in the constructor body that use this parameter.
        // We look for `paramName.something` patterns.
        const body = constructor.getBody();
        if ( !body ) {
          continue;
        }

        const accessedProperties = new Set<string>();

        body.forEachDescendant( node => {
          if ( Node.isPropertyAccessExpression( node ) ) {
            const expression = node.getExpression();

            // Direct access: paramName.property
            if ( Node.isIdentifier( expression ) && expression.getText() === paramName ) {
              accessedProperties.add( node.getName() );
            }
          }
        } );

        if ( accessedProperties.size > 0 ) {
          paramReports.push( {
            paramName: paramName,
            paramType: paramType,
            properties: [ ...accessedProperties ].sort()
          } );
        }
      }

      if ( paramReports.length > 0 ) {
        const className = classDeclaration.getName() || '<Unnamed>';
        reports.push( {
          className: className,
          filePath: sourceFile.getFilePath(),
          params: paramReports
        } );
      }
    }
  }

  // Sort by most-coupled first (highest total property count)
  reports.sort( ( a, b ) => {
    const totalA = a.params.reduce( ( sum, p ) => sum + p.properties.length, 0 );
    const totalB = b.params.reduce( ( sum, p ) => sum + p.properties.length, 0 );
    return totalA - totalB;
  } );

  // Print the report
  console.log( '=== Constructor Coupling Report ===\n' );

  for ( const report of reports ) {
    console.log( `${report.className} (${report.filePath})` );
    for ( const param of report.params ) {
      console.log( `  ${param.paramName}: ${param.paramType} — ${param.properties.length} propert${param.properties.length === 1 ? 'y' : 'ies'} used` );
      for ( const prop of param.properties ) {
        console.log( `    .${prop}` );
      }
    }
    console.log();
  }

  // Summary
  const totalClasses = reports.length;
  const totalParams = reports.reduce( ( sum, r ) => sum + r.params.length, 0 );
  console.log( `Summary: ${totalClasses} class(es) with ${totalParams} constructor parameter(s) that access object properties.` );
}

if ( process.argv.includes( '--help' ) ) {
  console.log( `
\x1b[1mUsage (run from the totality monorepo root):\x1b[0m
  \x1b[36mbash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts <repo-directory>\x1b[0m

\x1b[1mParameters:\x1b[0m
  \x1b[33m<repo-directory>\x1b[0m - The repo directory name (relative to the totality root) whose
                       TypeScript files should be analyzed. Must contain a 'tsconfig.json'.

\x1b[1mOptions:\x1b[0m
  \x1b[32m--help\x1b[0m                  - Displays this help message and exits.

\x1b[1mExample:\x1b[0m
  \x1b[36mbash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts quantum-wave-interference\x1b[0m

\x1b[1mNote:\x1b[0m
- Only constructor parameters are analyzed. Parameters named 'options' or 'providedOptions'
  are excluded.
- Only direct property accesses (param.property) inside the constructor body are counted.
- This is a read-only reporting tool — no files are modified.
  ` );
  process.exit( 0 );
}

if ( process.argv.length < 3 ) {
  console.error( 'Error: Please provide the path to the repository directory. Check --help for instructions.' );
  process.exit( 1 );
}

const repoPath = process.argv[ 2 ];

reportConstructorCoupling( repoPath )
  .then( () => console.log( '\nFinished.' ) )
  .catch( error => {
    console.error( 'An error occurred:', error );
    process.exit( 1 );
  } );
