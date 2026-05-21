// Copyright 2021-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import { getFullStringMap } from './getFullStringMap.js';
import { ReleaseBranch } from '../common/ReleaseBranch.js';
import { Locale } from '../browser-and-node/PerennialTypes.js';

/**
 * NOTE: release branch NEEDS to be checked out for this to be called, since we'll need the dependencies.json file
 */
export const parseScreenNames = async (
  releaseBranch: ReleaseBranch,
  locales: Locale[]
): Promise<Record<string, string[]>> => {

  const stringMap = await getFullStringMap( releaseBranch );
  const screenNameKeys = ( await releaseBranch.getPackageJSON() ).phet?.screenNameKeys || [];

  const localeData = await releaseBranch.checkout.getLocaleData();

  const result: Record<string, string[]> = {};
  for ( const locale of locales ) {
    const fallbackLocales = [
      locale,
      ...( localeData[ locale ].fallbackLocales || [] ),
      'en'
    ];

    // Locale fallback
    result[ locale ] = screenNameKeys.map( key => {
      for ( const fallbackLocale of fallbackLocales ) {
        if ( stringMap[ key ][ fallbackLocale ] ) {
          return stringMap[ key ][ fallbackLocale ];
        }
      }
      throw new Error( 'missing key: ' + key );
    } );
  }
  return result;
};
