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

import { Node, Project, Type } from 'ts-morph';

// Standard Property API methods — accessing these on a Property/TReadOnlyProperty is expected usage,
// not a coupling concern.
const PROPERTY_API_METHODS = new Set( [
  'value', 'link', 'lazyLink', 'unlink', 'unlinkAll', 'dispose', 'set', 'get',
  'addListener', 'removeListener', 'hasListener'
] );

// Standard array methods — accessing these on an array parameter is just using the array API.
const ARRAY_METHODS = new Set( [
  'map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce', 'reduceRight',
  'includes', 'indexOf', 'lastIndexOf', 'flat', 'flatMap', 'sort', 'reverse',
  'slice', 'splice', 'concat', 'join', 'push', 'pop', 'shift', 'unshift',
  'length', 'entries', 'keys', 'values', 'at', 'fill', 'copyWithin', 'findIndex'
] );

/**
 * Returns true if the type should be skipped entirely — primitives, Tandem, literal unions, etc.
 */
function isSkippedType( typeText: string, type: Type ): boolean {

  // Skip primitives
  if ( typeText === 'number' || typeText === 'string' || typeText === 'boolean' ) {
    return true;
  }

  // Skip Tandem
  if ( typeText === 'Tandem' ) {
    return true;
  }

  // Skip literal types and unions of literals (e.g., "left" | "right", 1 | 2)
  if ( type.isUnion() ) {
    const allLiterals = type.getUnionTypes().every( t =>
      t.isStringLiteral() || t.isNumberLiteral() || t.isBooleanLiteral() || t.isNull() || t.isUndefined()
    );
    if ( allLiterals ) {
      return true;
    }
  }
  if ( type.isStringLiteral() || type.isNumberLiteral() || type.isBooleanLiteral() ) {
    return true;
  }

  return false;
}

/**
 * Returns true if the type looks like a Property type (Property, TReadOnlyProperty, etc.)
 */
function isPropertyType( typeText: string ): boolean {
  return /^(Property|TReadOnlyProperty|TProperty|ReadOnlyProperty|PhetioProperty|TinyProperty|NumberProperty|BooleanProperty|StringProperty|DerivedProperty|EnumerationProperty|DynamicProperty)\b/.test( typeText );
}

/**
 * Returns true if the type is an array type.
 */
function isArrayType( typeText: string, type: Type ): boolean {
  return type.isArray() || typeText.endsWith( '[]' );
}

type ParamReport = {
  paramName: string;
  paramType: string;
  properties: string[];
  passedTo: string[];
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

        const type = param.getType();
        const paramType = type.getText( param );

        // Skip primitives, Tandem, literal unions
        if ( isSkippedType( paramType, type ) ) {
          continue;
        }

        // Find all property access expressions in the constructor body that use this parameter.
        // We look for `paramName.something` patterns.
        const body = constructor.getBody();
        if ( !body ) {
          continue;
        }

        const accessedProperties = new Set<string>();
        const passedTo = new Set<string>();

        body.forEachDescendant( node => {
          if ( Node.isPropertyAccessExpression( node ) ) {
            const expression = node.getExpression();

            // Direct access: paramName.property
            if ( Node.isIdentifier( expression ) && expression.getText() === paramName ) {
              accessedProperties.add( node.getName() );
            }
          }

          // Detect when the parameter is passed as an argument to a function/constructor call.
          if ( Node.isCallExpression( node ) || Node.isNewExpression( node ) ) {
            const args = node.getArguments();
            for ( const arg of args ) {
              if ( Node.isIdentifier( arg ) && arg.getText() === paramName ) {

                // Get the name of the function/constructor being called.
                const expression = node.getExpression();
                if ( Node.isIdentifier( expression ) ) {
                  passedTo.add( expression.getText() );
                }
                else if ( Node.isPropertyAccessExpression( expression ) ) {
                  passedTo.add( expression.getText() );
                }
              }
            }
          }
        } );

        // For Property types, filter out standard Property API accesses. Only report if there are
        // non-standard accesses (which would indicate reaching through the Property to something else).
        if ( isPropertyType( paramType ) ) {
          for ( const prop of accessedProperties ) {
            if ( PROPERTY_API_METHODS.has( prop ) ) {
              accessedProperties.delete( prop );
            }
          }
        }

        // For array types, filter out standard array method accesses.
        if ( isArrayType( paramType, type ) ) {
          for ( const prop of accessedProperties ) {
            if ( ARRAY_METHODS.has( prop ) ) {
              accessedProperties.delete( prop );
            }
          }
        }

        // Skip parameters that only have pass-through usage with no direct property access.
        // The coupling concern, if any, lives in the child class, not here.
        if ( accessedProperties.size === 0 ) {
          continue;
        }

        paramReports.push( {
          paramName: paramName,
          paramType: paramType,
          properties: [ ...accessedProperties ].sort(),
          passedTo: [ ...passedTo ].sort()
        } );
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

  // Sort by fewest properties first — those are the most actionable (big object, few accesses).
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
      const parts: string[] = [];
      if ( param.properties.length > 0 ) {
        parts.push( `${param.properties.length} propert${param.properties.length === 1 ? 'y' : 'ies'} accessed` );
      }
      if ( param.passedTo.length > 0 ) {
        parts.push( `passed to ${param.passedTo.length} function${param.passedTo.length === 1 ? '' : 's'}` );
      }
      console.log( `  ${param.paramName}: ${param.paramType} — ${parts.join( ', ' )}` );
      for ( const prop of param.properties ) {
        console.log( `    .${prop}` );
      }
      for ( const fn of param.passedTo ) {
        console.log( `    -> ${fn}()` );
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
