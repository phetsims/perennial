// Copyright 2021, University of Colorado Boulder
/**
 * Compare the commits between two dependencies.json files, and print out the commits that are different.
 *
 * USAGE:
 * cd perennial
 * node js/scripts/compare-dependencies-2.js ../mysim/dependenciesOLD.json ../mysim/dependencies.json
 *
 * NOTES: The old dependencies.json must be specified first. Also, keep in mind you may want to do a fresh build to get
 * an updated dependencies.json if you are trying to compare to main.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
const fs = require( 'fs' );
const _ = require( 'lodash' );

// Parse the command line arguments
const args = process.argv.slice( 2 );

// The first command line argument is the first project for comparison
const project1 = args[ 0 ];

// The second command line argument is the second project for comparison
const project2 = args[ 1 ];

const dependencies1 = JSON.parse( fs.readFileSync( project1 ) );
const dependencies2 = JSON.parse( fs.readFileSync( project2 ) );

const allKeys = _.uniq( [ ...Object.keys( dependencies1 ), ...Object.keys( dependencies2 ) ].filter( repo => repo !== 'comment' ) );

const issues = new Set();
let commitCount = 0;

// Iterate over the keys they have in common
allKeys.forEach( repo => {

  // If the key is in dependencies two
  if ( dependencies1[ repo ] && dependencies2[ repo ] ) {

    // Print the key and the version
    // console.log( `${repo} ${dependencies1[ repo ].sha} ${dependencies2[ repo ].sha}` );

    // If the shas are the same, print a message to the console that the shas are the same
    if ( dependencies1[ repo ].sha === dependencies2[ repo ].sha ) {
      console.log( `# ${repo}` );
      console.log( 'SHAs are the same' );
      console.log();
    }
    else {

      // We know the shas are different, and we want to compare them using `git log --oneline --ancestry-path`
      const command = `git -C ../${repo} log --oneline --ancestry-path ${dependencies1[ repo ].sha}..${dependencies2[ repo ].sha}`;

      // Run that command synchronously
      const buffer = require( 'child_process' ).execSync( command );

      // Convert the buffer to a string and print it out
      console.log( `# ${repo}` );
      const bufferString = buffer.toString();
      console.log( bufferString );

      // Split the buffer string into lines
      const lines = bufferString.split( '\n' );
      // console.log( lines.length );
      lines.forEach( line => {

        // If the line contains https://github.com/phetsims/ then add it to the set.
        if ( line.includes( 'https://github.com/phetsims/' ) && !line.includes( 'Merge branch \'main\'' ) ) {

          // Find the URL in line using a regular expression
          const url = line.substring( line.indexOf( 'https://github.com/phetsims/' ) );

          issues.add( url );
        }

        if ( line.trim().length > 0 ) {
          commitCount++;
        }
      } );
    }
  }
  else {
    console.log( `# ${repo}` );
    console.log( `Did not appear in both dependencies. project1=${dependencies1[ repo ]}, project2=${dependencies2[ repo ]}` );
    console.log();
  }
} );

console.log( 'Discovered issues:' );
console.log( Array.from( issues ).sort().join( '\n' ) );

console.log( `${commitCount} commits referenced ${issues.size} separate issues` );