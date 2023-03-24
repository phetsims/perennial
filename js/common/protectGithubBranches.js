// Copyright 2021, University of Colorado Boulder

/**
 * Sets branch protection rules for the provided list of repositories. The default branch protection rules prevent
 * deletion of the branch. There are other things you can do with branch protection rules but we decided not to
 * apply them at this time. See https://github.com/phetsims/special-ops/issues/197 for more information.
 *
 * See https://docs.github.com/en/graphql/reference/input-objects#createbranchprotectionruleinput for documentation
 * of what you can do with protection rules.
 *
 * If rules for the protected patterns already exist they will be deleted and replaced so they can be easily updated.
 *
 * USAGE:
 * protectGithubBranches.protectBranches( [ "my-first-repo", "my-second-repo" ] );
 *
 * of
 *
 * protectGithubBranches.clearBranchProtections( [ "my-first-repo", "my-second-repo" ] );
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const https = require( 'https' );
const buildLocal = require( './buildLocal' );

// protects master, main, and all branche used in production deploys
const BRANCH_NAME_PATTERNS = [ 'master', 'main', '*[0-9].[0-9]*' ];

// Options for the https request to the github graphql server
const options = {
  hostname: 'api.github.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    Authorization: `Bearer ${buildLocal.developerGithubAccessToken}`,
    'Content-Type': 'application/json',
    'user-agent': 'node.js'
  }
};

/**
 * Creates the GraphQL query string to get the existing branch protection rules for the provided repo name under
 * the phetsims project.
 *
 * @param {string} repositoryName
 * @returns {string}
 */
const createBranchProtectionRuleQueryData = repositoryName => {
  return createQueryData( `query BranchProtectionRule {
    repository(owner: "phetsims", name: "${repositoryName}") { 
      branchProtectionRules(first: 100) { 
        nodes {
          # pattern for the rule 
          pattern,
          
          # uniqueID for the rule assigned by github, required to request deletion
          id
        }
      }
    } }`
  );
};

/**
 * Gets the GraphQL query string that will delete an existing branch protection rule. Use
 * createBranchProtectionRuleQueryData to get the unique IDs for each rule.
 *
 * @param ruleId
 * @returns {string}
 */
const createDeleteBranchProtectionRuleMutationData = ruleId => {
  return createQueryData( `mutation {
    deleteBranchProtectionRule(input:{branchProtectionRuleId: "${ruleId}"} ) {
      clientMutationId
    }
  }` );
};

/**
 * Creates the data string that requests the creation of a new github branch protection rule using a GraphQL query and
 * sent with an HTTPS request. The default rule prevents branch deletion. There are other things that can be
 * constrained or protected for the branch, but we decided not to apply anything else at this time.
 * See https://docs.github.com/en/graphql/reference/input-objects#createbranchprotectionruleinput for list
 * of things you can do with rules.
 *
 * @param {string} repositoryId - Unique ID for the repo, see createRepositoryIdQueryData()
 * @param {string} namePattern - pattern for the rule, all branches matching with fnmatch will be protected
 * @returns {string}
 */
const createRepositoryRuleMutationData = ( repositoryId, namePattern ) => {
  return createQueryData( `mutation {
    createBranchProtectionRule(input: {
      pattern: "${namePattern}",
      allowsDeletions: false,
  
      repositoryId: "${repositoryId}"
    } )
    
    # I think this specifies the data returned after the server receives the mutation request, not used but required
    # to send the mutation
    {
      branchProtectionRule {
        pattern
      }
    }
    }` );
};

/**
 * Creates the data string that requests the unique ID of a github repository using a GraphQL query sent with an
 * HTTPS request.
 *
 * @param {string} repositoryName - Name of the phetsims repository
 * @returns {string}
 */
const createRepositoryIdQueryData = repositoryName => {
  return createQueryData( `query { repository(owner: "phetsims", name: "${repositoryName}") { id } }` );
};

/**
 * Wraps a query string with additional formatting so that it can be used in a GraphQL query sent with https.
 *
 * @param {string} queryString
 * @returns {string}
 */
const createQueryData = queryString => {
  return JSON.stringify( {
    query: queryString
  } );
};

/**
 * Returns the unique ID of the provided phetsims repository.
 * @param {string} repositoryName
 * @returns {Promise<string>}
 */
async function getRepositoryId( repositoryName ) {
  const handleJSONResponse = jsonResponse => {
    if ( !jsonResponse.data || jsonResponse.data.repository === null ) {
      throw new Error( `Did not find repository: ${repositoryName}` );
    }

    return jsonResponse.data.repository.id;
  };

  return sendPromisedHttpsRequest( createRepositoryIdQueryData( repositoryName ), handleJSONResponse );
}

/**
 * Returns an array of objects, one for each existing branch protection rule for the repository, that has
 * the protection rule pattern and the unique ID for the rule assigned by github.
 *
 * @param {string} repositoryName
 * @returns {Promise<*[]>} - array of nodes with key value pairs of { "pattern": string, "id": string }
 */
async function getExistingBranchProtectionRules( repositoryName ) {
  const handleJSONResponse = jsonResponse => {
    if ( jsonResponse.errors ) {
      throw new Error( jsonResponse.errors );
    }
    if ( !jsonResponse.data ) {
      throw new Error( `No data returned by getExistingBranchProtectionRules for repo ${repositoryName}` );
    }
    return jsonResponse.data.repository.branchProtectionRules.nodes;
  };

  return sendPromisedHttpsRequest( createBranchProtectionRuleQueryData( repositoryName ), handleJSONResponse );
}

/**
 * Creates the protection rule for all branches matching the namePattern for the phetsims repository with the provided
 * unique ID assigned by github.
 *
 * @param {string} repositoryId - unique ID for the repository, use getRepositoryId to get this
 * @param {string} namePattern - The pattern for the rule using fnmatch
 * @returns {Promise<Object>}
 */
async function writeProtectionRule( repositoryId, namePattern ) {
  const handleJSONResponse = jsonResponse => {
    if ( jsonResponse.errors ) {
      throw new Error( jsonResponse.errors );
    }
  };
  return sendPromisedHttpsRequest( createRepositoryRuleMutationData( repositoryId, namePattern ), handleJSONResponse );
}

/**
 * Deletes an existing rule. We assume that that by running this we want to overwrite the existing rule.
 *
 * @param {string} ruleId
 * @param {string} namePattern
 * @param {string} repositoryName
 * @returns {Promise<Object>}
 */
async function deleteExistingProtectionRule( ruleId, namePattern, repositoryName ) {
  const handleJSONResponse = jsonResponse => {
    if ( jsonResponse.errors ) {
      throw new Error( jsonResponse.errors );
    }
    else {
      console.log( `Deleted existing branch protection rule ${namePattern} for repo ${repositoryName}` );
    }
  };
  return sendPromisedHttpsRequest( createDeleteBranchProtectionRuleMutationData( ruleId ), handleJSONResponse );
}

/**
 * An async function that will delete all existing rules that match the provided namePattern for the repository.
 * Wrapped in a Promise so we can wait to write new rules until the existing rules are removed. If you try to
 * write over an existing rule without removing it github will respond with an error.
 *
 * @param {*[]} rules
 * @param {string} namePattern
 * @param {string} repositoryName
 * @returns {Promise<unknown[]>}
 */
async function deleteMatchingProtectionRules( rules, namePattern, repositoryName ) {

  const promises = [];
  rules.forEach( rule => {

    // only delete rules that match the new pattern we want to protect
    if ( rule.pattern === namePattern ) {
      promises.push( deleteExistingProtectionRule( rule.id, namePattern, repositoryName ) );
    }
  } );

  return Promise.all( promises );
}

/**
 * Sends a request to github's GraphQL server to query or mutate repository data.
 *
 * @param {string} queryData - the string sent with https
 * @param {function(Object)} handle - handles the JSON response from github
 * @returns {Promise<unknown>}
 */
async function sendPromisedHttpsRequest( queryData, handle ) {
  return new Promise( ( resolve, reject ) => {
    const request = https.request( options, response => {
      let responseBody = '';

      response.on( 'data', d => {
        responseBody += d;
      } );

      response.on( 'end', () => {
        const jsonResponse = JSON.parse( responseBody );

        try {
          const resolveValue = handle( jsonResponse );
          resolve( resolveValue );
        }
        catch( error ) {
          reject( error );
        }
      } );
    } );

    request.on( 'error', error => {
      console.error( error );
    } );

    request.write( queryData );
    request.end();
  } );
}

/**
 * Clear protections for the branches that PhET wants to protect.
 */
async function clearBranchProtections( repositories ) {
  for ( const repositoryName of repositories ) {
    for ( const namePattern of BRANCH_NAME_PATTERNS ) {
      try {
        const branchProtectionRules = await getExistingBranchProtectionRules( repositoryName );
        await deleteMatchingProtectionRules( branchProtectionRules, namePattern, repositoryName );
      }
      catch( error ) {
        console.log( `Error clearing github protection rule ${namePattern} for ${repositoryName}` );
      }
    }
  }
}

/**
 * Apply branch protection rules to prodcution branches (master, main, release branches).
 */
async function protectBranches( repositories ) {

  // if the rule for the protected branch already exists, delete it - we assume that running this again means we
  // want to update rules for each namePattern
  await clearBranchProtections( repositories );

  for ( const repositoryName of repositories ) {

    // get the unique ID for each repository
    const repositoryId = await getRepositoryId( repositoryName );

    for ( const namePattern of BRANCH_NAME_PATTERNS ) {

      try {
        await writeProtectionRule( repositoryId, namePattern );
        console.log( `${namePattern} protection rule set for ${repositoryName}` );
      }
      catch( error ) {
        console.log( `Error writing ${namePattern} rule for repo ${repositoryName}:` );
        console.log( error );
        console.log( '\n' );
      }
    }
  }
}

module.exports = {
  protectBranches: protectBranches,
  clearBranchProtections: clearBranchProtections
};