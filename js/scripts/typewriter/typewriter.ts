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
import { Project, Scope, SyntaxKind } from 'ts-morph';

const VISIT_CONSTRUCTOR_CLASS_PROPERTY_ASSIGNMENTS = false;

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

  const instanceMethodCombos = [];

  for ( const classDeclaration of classes ) {

    console.log( `# Enumerating class: ${classDeclaration.getName()}` );

    const methods = [
      ...classDeclaration.getInstanceMethods()
      // ...classDeclaration.getStaticMethods()
    ];

    for ( const method of methods ) {
      console.log( '\n\nenumerating: ', method.getName() );
      instanceMethodCombos.push( { file: file, className: classDeclaration.getName()!, methodName: method.getName() } );
    }

    if ( VISIT_CONSTRUCTOR_CLASS_PROPERTY_ASSIGNMENTS ) {

      // Get the constructors
      const constructors = classDeclaration.getConstructors();
      for ( const constructor of constructors ) {
        // console.log( '\n\nenumerating: ', constructor.getName() );
        // instanceMethodCombos.push( { file: file, className: classDeclaration.getName()!, methodName: constructor.getName() } );

        const statements = constructor.getStatements();

        // if the statement assigns a class property, then we need to create a class property for it.
        for ( const statement of statements ) {
          console.log( 'statement: ', statement.getText() );

          // Check if the statement is an expression statement
          if ( statement.getKind() === SyntaxKind.ExpressionStatement ) {
            // Get the expression within the expression statement
            const expression = statement.asKindOrThrow( SyntaxKind.ExpressionStatement ).getExpression();

            // Check if the expression is a binary expression (e.g. assignment)
            if ( expression.getKind() === SyntaxKind.BinaryExpression ) {
              const binaryExpr = expression.asKindOrThrow( SyntaxKind.BinaryExpression );

              // Check if the operator is '=' (the equals token)
              if ( binaryExpr.getOperatorToken().getKind() === SyntaxKind.EqualsToken ) {
                const leftSide = binaryExpr.getLeft();

                // Check if the left side is a property access expression like "this.propName"
                if ( leftSide.getKind() === SyntaxKind.PropertyAccessExpression ) {
                  const propAccess = leftSide.asKindOrThrow( SyntaxKind.PropertyAccessExpression );

                  // Ensure the object is "this"
                  if ( propAccess.getExpression().getText() === 'this' ) {
                    const propertyName = propAccess.getName();
                    console.log( `Found assignment to property: ${propertyName}` );

                    // Infer the type of the right-hand side expression
                    const rhs = binaryExpr.getRight();
                    const inferredType = rhs.getType().getText();

                    console.log( `Inferred type for ${propertyName}: ${inferredType}` );

                    // Insert the property declaration at the top of the class.
                    // It will be marked as private and readonly.
                    classDeclaration.insertProperty( 0, {
                      name: propertyName,
                      type: inferredType,
                      scope: Scope.Private,
                      isReadonly: true
                    } );
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if ( VISIT_CONSTRUCTOR_CLASS_PROPERTY_ASSIGNMENTS ) {

    // Save the modified file back to disk.
    await sourceFile.save();
  }

  console.log( 'Visiting combos: ', JSON.stringify( instanceMethodCombos, null, 2 ) );

  for ( const combo of instanceMethodCombos ) {

    // Run in a separate process, otherwise the Project will be corrupted and crash
    execSync( `sage run js/scripts/typewriter/visitInstanceMethod.ts ${combo.file} ${combo.className} ${combo.methodName}` );
  }
}

const pathFromCLIargs = process.argv[ 2 ];

// Run the script
visitFile( pathFromCLIargs ).then( () => console.log( 'Finished processing files.' ) );