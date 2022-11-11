// Copyright 2021, University of Colorado Boulder
// this is a file that runs in node
// it compares all the dependencies from one project to another project.
// Assumes you have a clean working copy, in case you are checking out shas

// import fs
const fs = require( 'fs' );
// import assert
const assert = require( 'assert' );

// Parse the command line arguments
const args = process.argv.slice( 2 );

// The first command line argument is the first project for comparison
const project1 = args[ 0 ];

// The second command line argument is the second project for comparison
const project2 = args[ 1 ];

// Assert that both project one and project to are defined
assert( project1, 'project1 is not defined' );
assert( project2, 'project2 is not defined' );

function loadDependenciesForProject( project ) {

// If project contains a #, Then the first part is the directories and the second part is the branch name
  const directory = project.split( '@' )[ 0 ];

// Get the branch or SHA name
  const target = project.split( '@' )[ 1 ];

// Print the project one directories and project one branch
//   console.log( 'project1Directories', directory );
//   console.log( 'project1Branch', target );

// If there is a branch name specified, fork and execute a command that will check out that branch in that directories
  if ( target ) {
    const command = `git -C ${directory} checkout ${target}`;
    // console.log( 'command', command );
    require( 'child_process' ).execSync( command );
  }

// Load dependencies.json from relative path one and parse it as JSON
  const dependencies = JSON.parse( fs.readFileSync( `${directory}/dependencies.json` ) );

  return dependencies;
}

const dependencies1 = loadDependenciesForProject( project1 );
const dependencies2 = loadDependenciesForProject( project2 );

const allKeys = [ ...Object.keys( dependencies1 ), ...Object.keys( dependencies2 ) ].filter( repo => repo !== 'comment' );

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
      console.log( lines.length );
      lines.forEach( line => {

        // If the line contains https://github.com/phetsims/ then add it to the set.
        if ( line.includes( 'https://github.com/phetsims/' ) && !line.includes( 'Merge branch \'master\'' ) ) {

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

console.log( 'Discovered issues' );
console.log( Array.from( issues ).sort().join( '\n' ) );

console.log( `${commitCount} commits referenced ${issues.size} separate issues` );