// Copyright 2021, University of Colorado Boulder

/**
 * Sets branch protection rules for the provided list of repositories.
 *
 * NOTE: Note ready for use!
 *
 * NOTE: Still in progress, team needs to decide which rules to use in, then we will presumably use this
 * on all active repos. See https://github.com/phetsims/special-ops/issues/197.
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

const https = require( 'https' );
const buildLocal = require( './buildLocal' );

/**
 * Creates the data string that requests the creation of a new github branch protection rule using a GraphQL query and
 * sent with an HTTPS request.
 * @param {string} repositoryId - Unique ID for the repo, see createRepositoryIdQueryData()
 * @returns {string}
 */
const createRepositoryRuleMutationData = repositoryId => {
  return createQueryData( `mutation {
  
    # pattern is only required field, add more if we want
    createBranchProtectionRule(input: {
      pattern: "*test*",
      allowsDeletions: false,
      allowsForcePushes: false,
  
      repositoryId: "${repositoryId}"
    } )
    
    # I think this specifies the data returned after the server receives the mutation request
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
 * @param {string} repositoryName - Name of the phetsims repository
 * @returns {string}
 */
const createRepositoryIdQueryData = repositoryName => {
  return createQueryData( `query { repository(owner: "phetsims", name: "${repositoryName}") { id } }` );
};

/**
 * Wraps a query string with additional formatting so that it can be used in a GraphQL query sent with https.
 * @param {string} queryString
 * @returns {string}
 */
const createQueryData = queryString => {
  return JSON.stringify( {
    query: queryString
  } );
};

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
 * Returns the unique ID of the provided phetsims repository.
 * @param {string} repositoryName
 * @returns {Promise<string>}
 */
async function getRepositoryId( repositoryName ) {
  return new Promise( resolve => {
    const request = https.request( options, response => {
      let responseBody = '';

      response.on( 'data', d => {
        responseBody += d;
      } );

      response.on( 'end', () => {
        const jsonResponse = JSON.parse( responseBody );
        const repositoryId = jsonResponse.data.repository.id;

        resolve( repositoryId );
      } );
    } );

    request.on( 'error', error => {
      console.error( error );
    } );

    const queryData = createRepositoryIdQueryData( repositoryName );
    request.write( queryData );
    request.end();
  } );
}

/**
 * Creates the branch protection rule for the phetsims repository with the provided unique ID.
 * @param {string} repositoryId
 * @returns {Promise<Object>}
 */
async function writeRule( repositoryId ) {
  return new Promise( ( resolve, reject ) => {
    const request = https.request( options, response => {
      let responseBody = '';

      response.on( 'data', d => {
        responseBody += d;
      } );

      response.on( 'end', () => {
        const jsonResponse = JSON.parse( responseBody );

        if ( jsonResponse.errors ) {
          reject( jsonResponse );
        }
        else {
          resolve( jsonResponse );
        }
      } );
    } );

    request.on( 'error', error => {
      console.error( error );
    } );

    request.write( createRepositoryRuleMutationData( repositoryId ) );
    request.end();
  } );
}

module.exports = async function( repositories ) {
  for ( const repositoryName of repositories ) {
    await ( getRepositoryId( repositoryName ).then( repositoryId => {
      writeRule( repositoryId ).then( () => {
        console.log( `Branch protection rule set for ${repositoryName}` );
      } ).catch( error => {
        console.log( `Error writing rule for repo ${repositoryName}:` );
        console.log( error );
        console.log( '\n' );
      } );
    } ) );
  }
};