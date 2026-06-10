// Copyright 2026, University of Colorado Boulder

/**
 * Reports how many properties of each constructor argument are used inside the constructor body.
 * This helps identify cases where a class receives a large object but only uses a few of its
 * properties — a sign that the constructor could accept those properties directly instead.
 *
 * The report is filtered to focus on actionable findings:
 * - Parameters named `options` or `providedOptions` are excluded.
 * - Parameters whose declared type is already minimal are skipped: axon Property types, Map/Set,
 *   and small value types (Range, Bounds2, Vector2, etc.). Receiving one of these IS the goal state.
 * - Parameters typed as a structural type alias (e.g. `type FooModel = {...}`) are classified as
 *   "already narrowed" rather than reported as findings — the type system already enforces the
 *   minimal contract.
 * - Parameters passed whole to other functions/constructors are classified as conduits and skipped;
 *   the coupling concern, if any, lives in the callee, not here. Calls to helpers declared in the
 *   SAME file are followed transitively instead, so their accesses count toward the parameter.
 * - Each finding reports accessed-count vs. the declared type's total public member count, and
 *   parameters typed as a concrete *Model/*Scene class with fewer than 5 members used are flagged
 *   as narrowing candidates.
 *
 * Usage (from the totality monorepo root):
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts <repo-directory>
 *
 * Example:
 *   bash perennial-alias/bin/sage run perennial-alias/js/scripts/reportConstructorCoupling.ts quantum-wave-interference
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import { ConstructorDeclaration, FunctionDeclaration, MethodDeclaration, Node, Project, SourceFile, ts, Type } from 'ts-morph';

// Standard array methods — accessing these on an array parameter is just using the array API.
const ARRAY_METHODS = new Set( [
  'map', 'filter', 'forEach', 'find', 'some', 'every', 'reduce', 'reduceRight',
  'includes', 'indexOf', 'lastIndexOf', 'flat', 'flatMap', 'sort', 'reverse',
  'slice', 'splice', 'concat', 'join', 'push', 'pop', 'shift', 'unshift',
  'length', 'entries', 'keys', 'values', 'at', 'fill', 'copyWithin', 'findIndex'
] );

// Small value types from dot — receiving one of these is already minimal, not a coupling concern.
const VALUE_TYPES = new Set( [
  'Range', 'Bounds2', 'Bounds3', 'Dimension2', 'Dimension3',
  'Vector2', 'Vector3', 'Vector4', 'Matrix3'
] );

// The reviewer's threshold: a concrete *Model/*Scene class parameter with fewer members used than
// this is a candidate for passing the pieces directly (or via a structural type alias).
const NARROWING_CANDIDATE_MAX_MEMBERS = 5;

/**
 * Returns the type name with any generic arguments and fully-qualified import prefixes stripped,
 * e.g. 'BaseScreenModel<T>' -> 'BaseScreenModel' and 'import("...").TReadOnlyProperty<unknown>' ->
 * 'TReadOnlyProperty'. Union constituents print with import prefixes when no context node is available.
 */
function getBaseTypeName( typeText: string ): string {
  return typeText.replace( /import\("[^"]*"\)\./g, '' ).replace( /<.*>$/s, '' );
}

/**
 * Returns true if the type should be skipped entirely because the parameter is already minimal —
 * primitives, literal unions, Tandem, axon Property types, Map/Set, and dot value types.
 */
function isSkippedType( typeText: string, type: Type ): boolean {

  // For unions, skip if every non-null/undefined constituent would be skipped (e.g. 'ReadonlyMap<...> | null').
  if ( type.isUnion() ) {
    return type.getUnionTypes().every( t =>
      t.isNull() || t.isUndefined() || isSkippedType( getBaseTypeName( t.getText() ), t )
    );
  }

  // Skip primitives and literals
  if ( type.isNumber() || type.isString() || type.isBoolean() ||
       type.isStringLiteral() || type.isNumberLiteral() || type.isBooleanLiteral() ) {
    return true;
  }

  const baseName = getBaseTypeName( typeText );

  // Skip Tandem
  if ( baseName === 'Tandem' ) {
    return true;
  }

  // Skip axon Property types — a parameter that is itself a Property is the goal state.
  if ( /^(Property|TReadOnlyProperty|TProperty|ReadOnlyProperty|PhetioProperty|TinyProperty|NumberProperty|BooleanProperty|StringProperty|StringUnionProperty|DerivedProperty|DynamicProperty|EnumerationProperty|MappedProperty)$/.test( baseName ) ) {
    return true;
  }

  // Skip Map/Set collections — .get/.has on a map is just using the collection API.
  if ( /^(Readonly)?(Map|Set)$/.test( baseName ) || /^Weak(Map|Set)$/.test( baseName ) ) {
    return true;
  }

  // Skip small value types
  if ( VALUE_TYPES.has( baseName ) ) {
    return true;
  }

  return false;
}

/**
 * Returns true if the type is an array type.
 */
function isArrayType( typeText: string, type: Type ): boolean {
  return type.isArray() || typeText.endsWith( '[]' );
}

/**
 * Counts the public members of a type (excluding private/protected declarations), so findings can
 * report 'uses N of M public members'. A low ratio on a large concrete class is the coupling smell.
 */
function countPublicMembers( type: Type ): number {
  return type.getProperties().filter( symbol => {
    const declarations = symbol.getDeclarations();
    return !declarations.some( declaration => {
      const flags = ts.getCombinedModifierFlags( declaration.compilerNode as ts.Declaration );
      return ( flags & ts.ModifierFlags.NonPublicAccessibilityModifier ) !== 0; // eslint-disable-line no-bitwise
    } );
  } ).length;
}

/**
 * If the parameter's declared type is a structural type alias (`type Foo = {...}`) or an inline
 * type literal, returns the alias name — these parameters are already narrowed by the type system.
 * Returns null otherwise.
 */
function getNarrowedAliasName( typeNode: Node | undefined ): string | null {
  if ( !typeNode ) {
    return null;
  }
  if ( Node.isTypeLiteral( typeNode ) ) {
    return '<inline type literal>';
  }
  if ( Node.isTypeReference( typeNode ) ) {
    const declarations = typeNode.getTypeName().getSymbol()?.getDeclarations() || [];
    for ( const declaration of declarations ) {
      if ( Node.isTypeAliasDeclaration( declaration ) ) {
        const aliasTypeNode = declaration.getTypeNode();
        if ( aliasTypeNode && Node.isTypeLiteral( aliasTypeNode ) ) {
          return declaration.getName();
        }
      }
    }
  }
  return null;
}

type CallableDeclaration = ConstructorDeclaration | FunctionDeclaration | MethodDeclaration;

/**
 * Resolves a call/new expression to a callable declared in the given source file, so that helper
 * functions, static/instance methods, and same-file class constructors can be followed transitively.
 * Returns null if the callee is declared elsewhere (or cannot be resolved).
 */
function getSameFileCallable( callNode: Node, sourceFile: SourceFile ): CallableDeclaration | null {
  if ( !Node.isCallExpression( callNode ) && !Node.isNewExpression( callNode ) ) {
    return null;
  }
  const declarations = callNode.getExpression().getSymbol()?.getDeclarations() || [];
  for ( const declaration of declarations ) {
    if ( declaration.getSourceFile() !== sourceFile ) {
      continue;
    }
    if ( ( Node.isFunctionDeclaration( declaration ) || Node.isMethodDeclaration( declaration ) ) && declaration.getBody() ) {
      return declaration;
    }
    if ( Node.isClassDeclaration( declaration ) ) {
      const childConstructor = declaration.getConstructors()[ 0 ];
      if ( childConstructor && childConstructor.getBody() ) {
        return childConstructor;
      }
    }
  }
  return null;
}

type UsageCollection = {

  // First-level property names accessed on the parameter, including transitively via same-file helpers.
  accessed: Set<string>;

  // Callees outside this file that receive the parameter whole — the conduit signal.
  passedToExternal: Set<string>;

  // Same-file helpers that were followed, for reporting.
  followedHelpers: Set<string>;
};

/**
 * Collects first-level property accesses on the named parameter within a callable body. When the
 * parameter is passed whole to a callable declared in the same file, recurses into that callable's
 * body (tracking the receiving parameter's name) so helper usage counts toward the original
 * parameter. Passing the parameter whole to anything declared elsewhere is recorded as a conduit.
 */
function collectParameterUsage(
  body: Node,
  paramName: string,
  sourceFile: SourceFile,
  visited: Set<string>,
  result: UsageCollection
): void {
  body.forEachDescendant( node => {

    // Direct access: paramName.property
    if ( Node.isPropertyAccessExpression( node ) ) {
      const expression = node.getExpression();
      if ( Node.isIdentifier( expression ) && expression.getText() === paramName ) {
        result.accessed.add( node.getName() );
      }
    }

    // Detect when the parameter is passed whole as an argument to a function/constructor call.
    if ( Node.isCallExpression( node ) || Node.isNewExpression( node ) ) {
      const args = node.getArguments();
      for ( const arg of args ) {
        if ( Node.isIdentifier( arg ) && arg.getText() === paramName ) {
          const calleeName = node.getExpression().getText();

          // Follow same-file helpers transitively instead of treating them as conduits.
          const sameFileCallable = getSameFileCallable( node, sourceFile );
          const targetParam = sameFileCallable && sameFileCallable.getParameters()[ args.indexOf( arg ) ];
          const targetBody = sameFileCallable && sameFileCallable.getBody();
          if ( sameFileCallable && targetParam && targetBody ) {
            const visitedKey = `${sameFileCallable.getPos()}:${targetParam.getName()}`;
            if ( !visited.has( visitedKey ) ) {
              visited.add( visitedKey );
              result.followedHelpers.add( calleeName );
              collectParameterUsage( targetBody, targetParam.getName(), sourceFile, visited, result );
            }
          }
          else {
            result.passedToExternal.add( calleeName );
          }
        }
      }
    }
  } );
}

type ParamReport = {
  paramName: string;
  paramType: string;
  properties: string[];
  followedHelpers: string[];
  totalPublicMembers: number;
  isNarrowingCandidate: boolean;
};

type ConstructorReport = {
  className: string;
  filePath: string;
  params: ParamReport[];
};

type SkippedParamReport = {
  className: string;
  filePath: string;
  paramName: string;
  paramType: string;
  detail: string;
};

async function reportConstructorCoupling( repoPath: string ): Promise<void> {

  const project = new Project( {
    tsConfigFilePath: `${repoPath}/tsconfig.json`
  } );

  const sourceFiles = project.getSourceFiles( `${repoPath}/js/**/*.ts` );
  console.log( `Found ${sourceFiles.length} source file(s) under ${repoPath}/js/**/*.ts\n` );

  const reports: ConstructorReport[] = [];
  const alreadyNarrowed: SkippedParamReport[] = [];
  const conduits: SkippedParamReport[] = [];

  for ( const sourceFile of sourceFiles ) {
    const classes = sourceFile.getClasses();

    for ( const classDeclaration of classes ) {
      const constructor = classDeclaration.getConstructors()[ 0 ];
      if ( !constructor ) {
        continue;
      }
      const className = classDeclaration.getName() || '<Unnamed>';

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

        // Skip parameters that are already minimal: primitives, Tandem, literal unions, Property
        // types, Map/Set, and value types.
        if ( isSkippedType( paramType, type ) ) {
          continue;
        }

        const body = constructor.getBody();
        if ( !body ) {
          continue;
        }

        const usage: UsageCollection = {
          accessed: new Set<string>(),
          passedToExternal: new Set<string>(),
          followedHelpers: new Set<string>()
        };
        collectParameterUsage( body, paramName, sourceFile, new Set<string>(), usage );

        // For array types, filter out standard array method accesses.
        if ( isArrayType( paramType, type ) ) {
          for ( const prop of usage.accessed ) {
            if ( ARRAY_METHODS.has( prop ) ) {
              usage.accessed.delete( prop );
            }
          }
        }

        if ( usage.accessed.size === 0 && usage.passedToExternal.size === 0 ) {
          continue;
        }

        // Structural type aliases are the goal state — the type system already enforces the
        // minimal contract, so classify rather than report.
        const aliasName = getNarrowedAliasName( param.getTypeNode() );
        if ( aliasName ) {
          alreadyNarrowed.push( {
            className: className,
            filePath: sourceFile.getFilePath(),
            paramName: paramName,
            paramType: aliasName,
            detail: `uses ${usage.accessed.size} of ${countPublicMembers( type )} declared members`
          } );
          continue;
        }

        // Parameters passed whole to externally-declared callables are conduits — narrowing here
        // requires narrowing the callees first, so skip rather than report.
        if ( usage.passedToExternal.size > 0 ) {
          const accessNote = usage.accessed.size > 0 ? `, plus ${usage.accessed.size} member(s) accessed directly` : '';
          conduits.push( {
            className: className,
            filePath: sourceFile.getFilePath(),
            paramName: paramName,
            paramType: paramType,
            detail: `passed whole to: ${[ ...usage.passedToExternal ].sort().join( ', ' )}${accessNote}`
          } );
          continue;
        }

        const totalPublicMembers = countPublicMembers( type );
        const isModelOrSceneClass = type.isClass() && /(Model|Scene)$/.test( getBaseTypeName( paramType ) );
        const isNarrowingCandidate = isModelOrSceneClass &&
                                     usage.accessed.size < NARROWING_CANDIDATE_MAX_MEMBERS &&
                                     totalPublicMembers >= usage.accessed.size * 2;

        paramReports.push( {
          paramName: paramName,
          paramType: paramType,
          properties: [ ...usage.accessed ].sort(),
          followedHelpers: [ ...usage.followedHelpers ].sort(),
          totalPublicMembers: totalPublicMembers,
          isNarrowingCandidate: isNarrowingCandidate
        } );
      }

      if ( paramReports.length > 0 ) {
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

  const candidates = reports.filter( r => r.params.some( p => p.isNarrowingCandidate ) );
  const others = reports.filter( r => !r.params.some( p => p.isNarrowingCandidate ) );

  const printReport = ( report: ConstructorReport ) => {
    console.log( `${report.className} (${report.filePath})` );
    for ( const param of report.params ) {
      const ratio = param.totalPublicMembers > 0 ? Math.round( 100 * param.properties.length / param.totalPublicMembers ) : 100;
      const flag = param.isNarrowingCandidate ? ' ⚠ NARROWING CANDIDATE' : '';
      console.log( `  ${param.paramName}: ${param.paramType} — uses ${param.properties.length} of ${param.totalPublicMembers} public members (${ratio}%)${flag}` );
      for ( const prop of param.properties ) {
        console.log( `    .${prop}` );
      }
      for ( const helper of param.followedHelpers ) {
        console.log( `    (followed same-file helper: ${helper})` );
      }
    }
    console.log();
  };

  console.log( '=== Constructor Coupling Report ===\n' );

  console.log( `--- Narrowing candidates: *Model/*Scene class with <${NARROWING_CANDIDATE_MAX_MEMBERS} members used (${candidates.length}) ---\n` );
  candidates.forEach( printReport );

  console.log( `--- Other findings (${others.length}) ---\n` );
  others.forEach( printReport );

  console.log( `--- Already narrowed: structural type alias parameters (${alreadyNarrowed.length}) ---\n` );
  for ( const entry of alreadyNarrowed ) {
    console.log( `  ${entry.className}.${entry.paramName}: ${entry.paramType} — ${entry.detail}` );
  }
  console.log();

  console.log( `--- Skipped conduits: parameter passed whole to externally-declared callables (${conduits.length}) ---\n` );
  for ( const entry of conduits ) {
    console.log( `  ${entry.className}.${entry.paramName}: ${entry.paramType} — ${entry.detail}` );
  }
  console.log();

  const totalParams = reports.reduce( ( sum, r ) => sum + r.params.length, 0 );
  const totalCandidateParams = reports.reduce( ( sum, r ) => sum + r.params.filter( p => p.isNarrowingCandidate ).length, 0 );
  console.log( `Summary: ${totalCandidateParams} narrowing candidate(s), ${totalParams} finding(s) total, ` +
               `${alreadyNarrowed.length} already narrowed, ${conduits.length} conduit(s) skipped.` );
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
- Parameters whose declared type is already minimal (Property types, Map/Set, Range/Bounds2/etc.,
  Tandem, primitives, literal unions) are skipped.
- Parameters typed as a structural type alias are classified as "already narrowed".
- Parameters passed whole to externally-declared callables are classified as conduits and skipped;
  same-file helper calls are followed transitively instead.
- Findings report accessed-count vs. total public member count; concrete *Model/*Scene class
  parameters with <5 members used are flagged as narrowing candidates.
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
