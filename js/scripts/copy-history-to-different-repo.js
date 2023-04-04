// Copyright 2021, University of Colorado Boulder

const execute = require( '../common/execute' );
const booleanPrompt = require( '../common/booleanPrompt' );

/**
 * Copy the history of a file or directory to a different repo.
 *
 * ### REQUIREMENT: `git filter-repo`############################################
 * ###
 * ### This process requires the command `git filter-repo`, which is recommended by the git documentation as an improvement
 * ### over `git filter-branch`, https://git-scm.com/docs/git-filter-branch#_warning. I used `git --exec-path` to see the
 * ### path for auxiliary git commands.
 * ###
 * ### On my mac it was `/Library/Developer/CommandLineTools/usr/libexec/git-core`
 * ### On my win it was `/C/Program\ Files/Git/mingw64/libexec/git-core`
 * ###
 * ### Installing `git filter-repo` on Windows consisted of these steps:
 * ### 1. Install python and confirm it is in the path and works from the command line
 * ### 2. Copy the raw contents of https://github.com/newren/git-filter-repo/blob/main/git-filter-repo into a file "git-filter-repo" in the --exec-path (it is easiest to write a file to you desktop and then click and drag the file into the admin-protected directory
 * ### 3. If your system uses "python" instead of "python3", change that in the 1st line of the file.
 * ### 4. Test using "git filter-repo", if it is installed correctly it will say something like: "No arguments specified"
 * ###
 * ### More instructions about installing are listed here:
 * ### https://github.com/newren/git-filter-repo#how-do-i-install-it
 * ##############################################################################
 *
 * USAGE:
 * node perennial/js/scripts/copy-history-to-different-repo source-path destination-repo
 *
 * EXAMPLE:
 * node perennial/js/scripts/copy-history-to-different-repo center-and-variability/js/common/view/QuestionBar.ts scenery-phet
 * node perennial/js/scripts/copy-history-to-different-repo counting-common/js/ number-suite-common
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Chris Klusendorf (PhET Interactive Simulations)
 */
( async () => {
  const args = process.argv.slice( 2 );

  const sourceRepo = args[ 0 ].split( '/' )[ 0 ];
  const relativePath = args[ 0 ].split( '/' ).slice( 1 ).join( '/' );

  const targetRepo = args[ 1 ];

  console.log( `Copying ${relativePath} from ${sourceRepo} to ${targetRepo}` );

  // git log --oneline --follow -M --name-status -- js/ABSwitch.ts
  // const stdout = await execute( 'git', `log --oneline --follow -M --name-status -- ${relativePath}`.split( ' ' ), `./perennial/${sourceRepo}` );
  const gitlog = await execute( 'git', `log --oneline --follow -M --name-status -- ${relativePath}`.split( ' ' ), `./${sourceRepo}` );

  const allFilenames = new Set();
  gitlog.split( '\n' ).forEach( line => {
    if ( line.length > 0 &&

         // Catch lines that start with an uppercase letter
         line[ 0 ].toUpperCase() === line[ 0 ] &&

         // Avoid lines that do not start with a letter.  Only letters have uppercase and lowercase
         line[ 0 ].toUpperCase() !== line[ 0 ].toLowerCase()
    ) {
      const terms = line.split( '\t' );
      const filenamesFromTerm = terms.slice( 1 );

      filenamesFromTerm.forEach( filenameFromTerm => {
        allFilenames.add( filenameFromTerm );
      } );
    }
  } );

  const filenameArray = Array.from( allFilenames.values() );
  console.log( filenameArray.join( '\n' ) );

  // git clone https://github.com/phetsims/vegas.git vegas-backup
  const historyCopyRepo = `${sourceRepo}-history-copy`;
  await execute( 'git', `clone -b master --single-branch https://github.com/phetsims/${sourceRepo}.git ${historyCopyRepo}`.split( ' ' ), '.' );

  const filterArgs = [ 'filter-repo' ];
  filenameArray.forEach( filename => {
    filterArgs.push( '--path' );
    filterArgs.push( filename );
  } );
  console.log( filterArgs.join( ' ' ) );
  const filterResults = await execute( 'git', filterArgs, historyCopyRepo );

  console.log( filterResults );

  if ( !await booleanPrompt( `Please inspect the filtered repo ${historyCopyRepo} to make sure it is ready for 
  merging. It should include all detected files:\n\n${filenameArray.join( '\n' )}\nWant to merge into ${targetRepo}?`, false ) ) {
    console.log( 'Aborted' );
    return;
  }

  await execute( 'git', `remote add ${historyCopyRepo} ../${historyCopyRepo}`.split( ' ' ), `./${targetRepo}` );
  await execute( 'git', `fetch ${historyCopyRepo}`.split( ' ' ), `./${targetRepo}` );
  await execute( 'git', `merge ${historyCopyRepo}/master --allow-unrelated`.split( ' ' ), `./${targetRepo}` );
  await execute( 'git', `remote remove ${historyCopyRepo}`.split( ' ' ), `./${targetRepo}` );

  const aboutToPush = await execute( 'git', 'diff --stat --cached origin/master'.split( ' ' ), `./${targetRepo}` );
  console.log( 'About to push: ' + aboutToPush );

  const unpushedCommits = await execute( 'git', 'log origin/master..master'.split( ' ' ), `./${targetRepo}` );
  console.log( unpushedCommits );

  console.log(
    `Merged into target repo ${targetRepo}. The remaining steps are manual:   
* Inspect the merged repo ${targetRepo} files and history and see if the result looks good.
* Delete the temporary cloned repo: rm -rf ${historyCopyRepo}
* Update the namespace and registry statement, if appropriate.
* Move the file to the desired directory.
* Type check, lint and test the new code.
* If the history, file, type checks and lint all seem good, git push the changes. (otherwise re-clone).
* Delete the copy in the prior directory. In the commit message, refer to an issue so there is a paper trail.
` );
} )();