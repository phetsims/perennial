// Copyright 2024, University of Colorado Boulder

// This is a prototype and I want to mark areas that need more work.
/* eslint-disable phet/todo-should-have-issue */

/**
 * PROTOTYPE: Careful using this, it is not well tested.
 *
 * This script supports managing feature branches in many repos all at once. You can perform operations like creating,
 * deleting, and merging branches in all active repositories.
 *
 * Ensure branch naming follows PhET conventions: lowerCamelCase with letters and numbers only.
 *
 * Usage: node script.js <command> <branch-name>
 * Commands:
 *   - create: Creates a new branch across all active repositories.
 *   - delete-local: Deletes a branch locally in all repositories.
 *   - delete-remote: Deletes a branch from the remote repository in all repositories.
 *   - checkout: Checks out an existing branch in all repositories.
 *   - merge-into-feature: Merges 'main' into the specified feature branch.
 *   - merge-into-main: Merges a specified feature branch into 'main'.
 *   - check-branch: Prints repos that have commits ahead of main.
 *   - check-main: Prints repos that are missing commits from main.
 *   - check-working: Prints repos that have local uncommitted changes.
 *
 * Examples:
 *   - node script.js create myFeatureBranch
 *   - node script.js delete-local myFeatureBranch
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const readline = require( 'readline' );
const { exec } = require( 'child_process' );

// Path to the root directory with all repositories.
const rootPath = `${__dirname}/../../..`;

const fs = require( 'fs' );
const contents = fs.readFileSync( `${__dirname}../../../data/active-repos`, 'utf8' ).trim();
const repos = contents.split( '\n' ).map( sim => sim.trim() );
// const repos = [
//   'axon',
//   'aqua'
// ];

/**
 * Runs a git command in a repository asynchronously.
 * @param {string} repo - The name of the repository to execute the git command in.
 * @param {string} command - The git command to execute.
 * @returns {Promise<Buffer>} - A promise that resolves with the result of the command.
 */
const execGitCommand = async ( repo, command ) => {
  const path = `${rootPath}/${repo}`;

  return new Promise( ( resolve, reject ) => {

    // pipe hides results but makes them available for processing
    exec( `git -C ${path} ${command}`, { stdio: 'pipe' }, ( error, stdout, stderr ) => {
      if ( error ) {
        console.error( `Error executing git command in ${repo}: ${stderr || error.message}` );
        reject( error );
        return;
      }
      resolve( stdout );
    } );
  } );
};

/**
 * Get a y/n response from the user.
 *
 * @param {string} question - y/n is appended to the question
 * @param {async function} onConfirm - callback if the user confirms
 * @param {async function } onCancel - callback if the user cancels
 */
const getConfirmation = ( question, onConfirm, onCancel ) => {
  const rl = readline.createInterface( {
    input: process.stdin,
    output: process.stdout
  } );

  rl.question( `${question} (y/n) `, async answer => {
    if ( answer.toLowerCase() === 'y' ) {
      await onConfirm();
    }
    else {
      await onCancel();
    }
    rl.close();
  } );
};

/**
 * Check if a branch exists in a repository.
 * @param repo
 * @param branchName
 * @param checkRemote - check remote as well?
 */
const branchExists = async ( repo, branchName, checkRemote ) => {
  try {

    // Check for the branch locally
    const localPromise = await execGitCommand( repo, `branch --list ${branchName}` );
    const localBranches = localPromise.toString().trim();
    if ( localBranches ) {
      return true;
    }

    if ( checkRemote ) {

      // Check for the branch remotely
      const remotePromise = await execGitCommand( repo, `branch -r --list origin/${branchName}` );
      const remoteBranches = remotePromise.toString().trim();
      return !!remoteBranches;
    }

    return false;
  }
  catch( error ) {
    console.error( `Error checking branches in ${repo}: ${error.message}` );
    process.exit( 1 );
    return false;
  }
};

/**
 * Validate a branch name. Convention uses the same as PhET's 'one-off' branches which means only letters and numbers and in
 * lowerCamelCase.
 */
const validateBranchName = branchName => {
  const pattern = /^[a-z]+([A-Z][a-z0-9]+)*$/;
  if ( !pattern.test( branchName ) ) {
    console.error( `Branch name '${branchName}' is invalid. Branch names must be lower camel case and only contain letters and numbers.` );
    process.exit( 1 );
  }
};

/**
 * Make sure that the branch exists in all repositories. As soon as one repository does not have the branch, the script
 * will exit.
 */
const ensureBranchExists = async ( branchName, checkRemote ) => {
  console.log( 'Checking branch exists in all repositories...' );

  for ( const repo of repos ) {
    const exists = await branchExists( repo, branchName, checkRemote );
    if ( !exists ) {
      console.error( `Branch '${branchName}' does not exist in ${repo}. You may need to pull it from remote.` );
      process.exit( 1 );
    }
  }
};

/**
 * Creates a new branch in all repositories. Feature branches are alwasy created from main.
 * If the branch already exists in any repository (local or remote), the script will exit.
 * Working copy will be on the new branch after this operation.
 */
const createBranch = async branchName => {

  // Make sure the branchName is valid
  validateBranchName( branchName );

  console.log( 'Checking out main to create feature branches...' );
  for ( const repo of repos ) {
    await execGitCommand( repo, 'checkout main' );
  }

  // First, check to see if the provided branch name already exists in the repo.
  console.log( 'Making sure branch name is available...' );
  for ( const repo of repos ) {
    const existsLocal = await branchExists( repo, branchName, false );
    const existsRemote = await branchExists( repo, branchName, true );
    if ( existsLocal || existsRemote ) {
      console.error( `Branch '${branchName}' already exists in ${repo}. Aborting create.` );
      process.exit( 1 );
    }
  }

  console.log( `Branch '${branchName}' is available in all repositories. Creating...` );

  for ( const repo of repos ) {
    try {
      await execGitCommand( repo, 'checkout main' );
      await execGitCommand( repo, `checkout -b ${branchName}` );
      console.log( `Branch ${branchName} created in ${repo}` );
    }
    catch( error ) {
      console.error( `Error creating branch in ${repo}: ${error.message}` );
      process.exit( 1 );
    }
  }

  console.log( `Branch '${branchName}' created across all repositories.` );
};

const deleteBranch = async ( branchName, remote ) => {
  getConfirmation( `Are you sure you want to delete the branch '${branchName}' ${remote ? 'from REMOTE' : 'locally'} in all repositories?`, async () => {

    // Delete the branch in each repository
    for ( const repo of repos ) {
      const exists = await branchExists( repo, branchName, remote );
      if ( !exists ) {

        // The branch does not exist, skipping.
        console.log( `${repo} does not have branch ${branchName}, skipping delete...` );
        continue;
      }

      try {
        console.log( `Deleting branch '${branchName}' in ${repo}...` );
        await execGitCommand( repo, 'checkout main' );
        const command = remote ? `push origin --delete ${branchName}` : `branch -D ${branchName}`;
        await execGitCommand( repo, command );
      }
      catch( error ) {
        console.error( `Error deleting branch in ${repo}: ${error.message}` );
        process.exit( 1 );
      }
    }

    console.log( `Branch '${branchName}' deleted from all repositories.` );
  }, async () => {
    console.log( 'Aborting delete.' );
    process.exit( 0 );
  } );
};

/**
 * Make sure that the working copy is clean in all repositories.
 */
const checkCleanWorkingCopy = async () => {
  console.log( 'Checking working copy...' );
  for ( const repo of repos ) {
    try {
      const status = await execGitCommand( repo, 'status --porcelain' );
      if ( status.toString().trim() ) {
        console.error( `Working copy is not clean in ${repo}. Please commit or stash changes before continuing.` );
        process.exit( 1 );
      }
    }
    catch( error ) {
      console.error( `Error checking working copy in ${repo}: ${error.message}` );
      process.exit( 1 );
    }
  }
};

// Checkout the branch in each repository
const checkoutBranch = async branchName => {

  // First make sure that the working copy is clean before checking out any branches.
  await checkCleanWorkingCopy();

  for ( const repo of repos ) {
    try {
      await execGitCommand( repo, 'checkout main' );
      await execGitCommand( repo, `checkout ${branchName}` );

      console.log( `Checked out branch '${branchName}' in ${repo}` );
    }
    catch( error ) {
      console.error( `Error checking out branch in ${repo}: ${error.message}` );
      process.exit( 1 );
    }
  }
};

/**
 * Merge main into the feature branch in each repository. This will leave you with all repos on the feature branch.
 * Pull main before running this command.
 * TODO: UNTESTED
 */
const mergeMainIntoFeature = async branchName => {

  // Make sure that branches are available locally for the merge.
  await ensureBranchExists( branchName, false );

  const reposWithCommitsBehind = await getDeviatedRepos( branchName, false );

  // First, check out the branch in all repos
  await checkoutBranch( branchName );

  // Merge main into the feature branch in each repository
  for ( const repo of reposWithCommitsBehind ) {
    try {

      console.log( `Merging main into ${branchName} for ${repo}` );
      const resultsCode = await execGitCommand( repo, 'merge main' );
      const results = resultsCode.toString().trim();

      // Check for conflicts
      // TODO: Is there a better check for this?
      if ( results.includes( 'CONFLICT' ) ) {
        console.log( `Conflicts detected in ${repo}. Please resolve conflicts and commit changes before continuing.` );
      }
    }
    catch( error ) {
      console.error( `Error merging main into feature branch in ${repo}: ${error.message}` );
    }
  }

  console.log( `Merged main into feature branch '${branchName}' in all repositories.` );
};

/**
 * Merge the feature branch into main in each repository.
 * Pull main before running this command
 * TODO: UNTESTED
 */
const mergeFeatureIntoMain = async branchName => {

  // Make sure the branch exists locally before merging
  await ensureBranchExists( branchName, false );

  const reposWithCommitsAhead = await getDeviatedRepos( branchName, true );

  // First, checkout main in all repos
  console.log( 'checking out main...' );
  await checkoutBranch( 'main' );

  // Merge the feature branch into main in each repository
  for ( const repo of reposWithCommitsAhead ) {
    try {
      await execGitCommand( repo, 'checkout main' );

      console.log( `Merging ${branchName} into main in ${repo}` );
      const resultsPromise = await execGitCommand( repo, `merge ${branchName}` );
      const results = resultsPromise.toString().trim();

      // Check for conflicts
      if ( results.includes( 'CONFLICT' ) ) {
        console.log( `Conflicts detected in ${repo}. Please resolve conflicts and commit changes before continuing.` );
      }
    }
    catch( error ) {
      console.error( `Error merging feature branch into main in ${repo}: ${error.message}` );
    }
  }
};

/**
 * Returns a list of branches that have commits deviating from main.
 * @param branchName
 * @param ahead - If true, returns repos that have commits ahead of main. If false, returns repos that are missing commits from main.
 * @returns {Promise<*[]>}
 */
const getDeviatedRepos = async ( branchName, ahead ) => {
  const deviatedRepos = [];

  for ( const repo of repos ) {
    try {

      // Use --left-right to distinguish commits ahead and behind
      const status = await execGitCommand( repo, `rev-list --left-right --count ${branchName}...origin/main` );
      const [ aheadCount, behindCount ] = status.toString().trim().split( '\t' ).map( Number );

      // leftCount represents commits ahead in the branch, rightCount represents commits ahead in main
      if ( ahead && aheadCount > 0 ) {
        deviatedRepos.push( repo );
      }
      else if ( !ahead && behindCount > 0 ) {
        deviatedRepos.push( repo );
      }
    }
    catch( error ) {
      console.error( `Error checking branch status in ${repo}: ${error.message}` );
      process.exit( 1 );
    }
  }

  return deviatedRepos;
};

/**
 * Prints any repos that have commits ahead of main.
 *
 * @param branchName
 * @param ahead - If true, prints repos that have commits ahead of main. If false, prints repos that are missing commits from main.
 */
const checkBranchStatus = async ( branchName, ahead ) => {
  console.log( 'Checking branch status...' );
  const deviatedRepos = await getDeviatedRepos( branchName, ahead );

  if ( deviatedRepos.length === 0 ) {
    console.log( 'All repositories are up to date with main.' );
  }
  else {
    console.log( `The following repositories have commits ${ahead ? 'ahead of' : 'behind'} main:` );
    for ( const repo of deviatedRepos ) {
      console.log( repo );
    }
  }
};

/**
 * Prints a list of repositories that have uncommitted changes.
 * @returns {Promise<void>}
 */
const checkWorkingStatus = async () => {
  console.log( 'The following repositories have uncommitted changes:' );
  for ( const repo of repos ) {
    try {
      const status = await execGitCommand( repo, 'status --porcelain' );
      if ( status.toString().trim() ) {
        console.log( repo );
      }
    }
    catch( error ) {
      console.error( `Error checking working status in ${repo}: ${error.message}` );
      process.exit( 1 );
    }
  }
};

const main = async () => {
  const args = process.argv.slice( 2 );

  if ( args.length < 2 ) {
    console.error( 'Usage: node script.js <command> <branch-name>' );
    process.exit( 1 );
  }

  const command = args[ 0 ];
  const branchName = args[ 1 ];

  switch( command ) {
    case 'create':
      await createBranch( branchName );
      break;
    case 'delete-local':
      await deleteBranch( branchName, false );
      break;
    case 'delete-remote':
      await deleteBranch( branchName, true );
      break;
    case 'checkout':
      await checkoutBranch( branchName );
      break;
    case 'merge-into-feature':
      await mergeMainIntoFeature( branchName );
      break;
    case 'merge-into-main':
      await mergeFeatureIntoMain( branchName );
      break;
    case 'check-branch':
      await checkBranchStatus( branchName, true );
      break;
    case 'check-main':
      await checkBranchStatus( branchName, false );
      break;
    case 'check-working':
      await checkWorkingStatus();
      break;
    default:
      console.error( 'Unknown command. Valid commands are: create, delete-local, delete-remote, checkout, merge-into-feature, merge-into-main' );
      process.exit( 1 );
  }
};

main();