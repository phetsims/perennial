// Copyright 2025, University of Colorado Boulder

/**
 * One step in converting JavaScript to TypeScript is to move JSDoc annotations to the method signature.
 * Runs in a separate process since we do text operations that disrupt the ts-morph Project.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import process from 'process';
import { Project } from 'ts-morph';
import { IntentionalPerennialAny } from '../../browser-and-node/PerennialTypes.js';
import moveJSDocParamsToSignature from './prompts/moveJSDocParamsToSignature.js';

async function visitInstanceMethod( file: string, className: string, methodName: string ): Promise<void> {
  // file is a relative string like '../myRepo/js/buttons/RoundToggleButton.ts'
  // extract the first two parts to get the repo path

  const repoPath = file.split( '/' ).slice( 0, 2 ).join( '/' );

  // Initialize a new ts-morph Project
  const project = new Project( {

    // Assuming tsconfig.json is in the root, adjust if necessary
    tsConfigFilePath: `${repoPath}/tsconfig.json`
  } );

  const sourceFile = project.getSourceFile( file )!;

  const classes = sourceFile.getClasses();

  for ( const classDeclaration of classes ) {

    if ( classDeclaration.getName() !== className ) {
      continue;
    }

    console.log( `# Processing class: ${classDeclaration.getName()}` );

    const members = [
      // ...classDeclaration.getInstanceProperties(),
      ...classDeclaration.getInstanceMethods()
      // ...classDeclaration.getStaticProperties(),
      // ...classDeclaration.getStaticMethods()
    ];

    for ( const member of members ) {

      if ( member.getName() !== methodName ) {
        continue;
      }

      console.log( '\n\nSTARTING: ', member.getName() );

      const method = member;

      const jsDocs = method.getJsDocs();
      let jsDocRawText = '(No JSDoc found)';

      if ( jsDocs.length > 0 ) {
        // We'll just take the first one if multiple JSDocs exist
        const jsDoc = jsDocs[ 0 ];

        // Use .getStart() / .getEnd() to slice from the file text
        const docStart = jsDoc.getStart();
        const docEnd = jsDoc.getEnd();
        jsDocRawText = sourceFile.getFullText().substring( docStart, docEnd ).trim();
      }

      console.log( '--- JSDoc Text ---' );
      console.log( jsDocRawText );

      const methodText = method.getText();
      const body = method.getBody();

      // If the method has a body, substring up to the body's start
      let signatureText: string;
      if ( body ) {
        // Convert method.getStart() to an index inside methodText
        const bodyStartRelative = body.getStart() - method.getStart();
        signatureText = methodText.substring( 0, bodyStartRelative ).trim();
      }
      else {
        // Abstract or bodyless method – the entire method text is effectively the signature
        signatureText = methodText.trim();
      }

      console.log( `\n## Method: ${method.getName()}` );
      console.log( '--- Signature Text ---' );
      console.log( signatureText );

      // Bundle into a command for an LLM.

      console.log( '############# CONTENTS #############' );
      console.log( jsDocRawText + signatureText );
      console.log( '############# END CONTENTS #############' );

      try {
        const response = await fetch( 'https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify( {
            // model: 'openai/gpt-3.5-turbo',
            model: 'deepseek/deepseek-chat',
            messages: [
              ...moveJSDocParamsToSignature,
              {
                role: 'user',
                content: jsDocRawText + signatureText
              } ],
            provider: {
              order: [
                'DeepSeek'
              ]
            }
          } )
        } );
        if ( !response.ok ) {
          throw new Error( `Request failed with status ${response.status}` );
        }

        const data = await response.json() as IntentionalPerennialAny;

        // data will contain the API response
        console.log( data.choices[ 0 ].message.content );

        // Assume newMethodText is the new header (JSDoc + signature) from the LLM.
        const newMethodText = data.choices[ 0 ].message.content;
        console.log( '### New Header Text from LLM ###' );
        console.log( newMethodText );

        // Determine the range in the source file that will be replaced.
        const replaceStart = jsDocs.length > 0 ? jsDocs[ 0 ].getStart() : method.getStart();
        const replaceEnd = body ? body.getStart() : method.getEnd();

        // Replace just the header: from the start of the JSDoc (or method) up to the beginning of the body.
        sourceFile.replaceText( [ replaceStart, replaceEnd ], newMethodText );

        // Save the file (synchronously, or you can await an async save).
        sourceFile.saveSync();

        process.exit( 0 );
      }
      catch( error ) {
        console.error( 'Error:', error );
      }
    }
  }
}

// Run the script
visitInstanceMethod( process.argv[ 2 ], process.argv[ 3 ], process.argv[ 4 ] ).then( () => console.log( 'Finished processing files.' ) );