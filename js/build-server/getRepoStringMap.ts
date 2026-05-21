// Copyright 2023-2026, University of Colorado Boulder

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in a given repo.
 *
 * @author Jonathan Olson (PhET Interactive Simulations)
 */

import { loadJSON } from '../common/loadJSON.js';
import fs from 'fs';
import { EnglishStringsJSON, InversedStringMap, PackageJSON, PartialStringKey, Repo } from '../browser-and-node/PerennialTypes.js';
import winston from 'winston';

/**
 * Returns an inverse string map (stringMap[ stringKey ][ locale ]) for all strings in a given repo.
 */
export const getRepoStringMap = async (
  repo: Repo,
  checkoutDir: string
): Promise<InversedStringMap> => {

  // partialKeyMap[ partialStringKey ][ locale ] = stringValue
  const partialKeyMap: InversedStringMap = {};

  // If we're not a repo with strings
  if ( !fs.existsSync( `${checkoutDir}/${repo}/${repo}-strings_en.json` ) ) {
    return {};
  }

  const packageJSON: PackageJSON = await loadJSON( `${checkoutDir}/${repo}/package.json` );
  const requirejsNamespace = packageJSON.phet!.requirejsNamespace!;

  if ( !requirejsNamespace ) {
    winston.warn( `Repo ${repo} does not have a requirejsNamespace in its package.json, but has a strings file` );
    return {};
  }

  const englishStrings: EnglishStringsJSON = await loadJSON( `${checkoutDir}/${repo}/${repo}-strings_en.json` );

  // Support recursive structure of English string files. Tests for `value: <<string type>>` to determine if it's a string.
  // Fills partialKeyMap
  ( function recur( stringStructure: EnglishStringsJSON, stringKeyParts: PartialStringKey[] ) {
    if ( typeof stringStructure.value === 'string' ) {
      partialKeyMap[ stringKeyParts.join( '.' ) ] = {
        en: stringStructure.value
      };
    }
    Object.keys( stringStructure ).forEach( partialKey => {
      if ( typeof stringStructure[ partialKey ] === 'object' ) {
        // @ts-expect-error - we know this is an EnglishStringsJSON, but the type system doesn't
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
  const result: InversedStringMap = {};

  // Prepend the requirejsNamespace to the string keys
  Object.keys( partialKeyMap ).forEach( partialKey => {
    result[ `${requirejsNamespace}/${partialKey}` ] = partialKeyMap[ partialKey ];
  } );

  return result;
};
