// Copyright 2023, University of Colorado Boulder

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in a given repo.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const loadJSON = require( '../common/loadJSON' );
const fs = require( 'fs' );

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in a given repo.
 * @public
 *
 * @param {string} repo - The repository name
 * @param {string} checkoutDir
 * @returns {Promise.<stringMap[ stringKey ][ locale ]>}
 */
module.exports = async function getRepoStringMap( repo, checkoutDir ) {

  // partialKeyMap[ partialStringKey ][ locale ] = stringValue
  const partialKeyMap = {};

  // If we're not a repo with strings
  if ( !fs.existsSync( `${checkoutDir}/${repo}/${repo}-strings_en.json` ) ) {
    return {};
  }

  const packageJSON = await loadJSON( `${checkoutDir}/${repo}/package.json` );
  const requirejsNamespace = packageJSON.phet.requirejsNamespace;

  const englishStrings = await loadJSON( `${checkoutDir}/${repo}/${repo}-strings_en.json` );

  // Support recursive structure of English string files. Tests for `value: <<string type>>` to determine if it's a string.
  // Fills partialKeyMap
  ( function recur( stringStructure, stringKeyParts ) {
    if ( typeof stringStructure.value === 'string' ) {
      partialKeyMap[ stringKeyParts.join( '.' ) ] = {
        en: stringStructure.value
      };
    }
    Object.keys( stringStructure ).forEach( partialKey => {
      if ( typeof stringStructure[ partialKey ] === 'object' ) {
        recur( stringStructure[ partialKey ], [ ...stringKeyParts, partialKey ] );
      }
    } );
  } )( englishStrings, [] );

  // Fill partialKeyMap with other locales (if the directory in babel exists)
  if ( fs.existsSync( `${checkoutDir}/babel/${repo}` ) ) {
    for ( const stringFilename of fs.readdirSync( `${checkoutDir}/babel/${repo}` ) ) {
      const localeStrings = await loadJSON( `${checkoutDir}/babel/${repo}/${stringFilename}` );

      // Extract locale from filename
      const firstUnderscoreIndex = stringFilename.indexOf( '_' );
      const periodIndex = stringFilename.indexOf( '.' );
      const locale = stringFilename.substring( firstUnderscoreIndex + 1, periodIndex );

      Object.keys( localeStrings ).forEach( partialStringKey => {
        if ( partialKeyMap[ partialStringKey ] ) {
          partialKeyMap[ partialStringKey ][ locale ] = localeStrings[ partialStringKey ].value;
        }
      } );
    }
  }

  // result[ stringKey ][ locale ] = stringValue
  const result = {};

  // Prepend the requirejsNamespace to the string keys
  Object.keys( partialKeyMap ).forEach( partialKey => {
    result[ `${requirejsNamespace}/${partialKey}` ] = partialKeyMap[ partialKey ];
  } );

  return result;
};