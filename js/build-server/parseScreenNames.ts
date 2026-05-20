// Copyright 2021-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import axios from 'axios';
import getFullStringMap from './getFullStringMap.js';
import { loadJSON } from '../common/loadJSON.js';
import { gitCheckout } from '../common/git/gitCheckout.js';

/**
 * NOTE: release branch NEEDS to be checked out for this to be called, since we'll need the dependencies.json file
 *
 * @param {string} simName
 * @param {string[]} locales - a list of locale codes
 * @param {string} checkoutDir
 * @returns {Promise.<{}>}
 */
export const parseScreenNames = async (
  simName: string,
  locales: string[],
  checkoutDir: string
): Promise<Record<string, string[]>> => {

  const stringMap = await getFullStringMap( simName, checkoutDir );
  const packageObject = await loadJSON( `${checkoutDir}/${simName}/package.json` );
  const screenNameKeys = packageObject.phet.screenNameKeys || [];

  const localeData = await loadJSON( `${checkoutDir}/babel/localeData.json` );

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

export const parseScreenNamesAllSimulations = async (): Promise<Record<string, Record<string, string[]>>> => {
  const url = 'https://phet.colorado.edu/services/metadata/1.3/simulations?format=json&type=html&summary';
  const projects = ( await axios.get( url ) ).data.projects;

  const screenNameObject: Record<string, Record<string, string[]>> = {};

  for ( let projectIndex = 0; projectIndex < projects.length; projectIndex++ ) {
    const project = projects[ projectIndex ];
    const simulation = project.simulations[ 0 ];
    const simName = simulation.name;
    const locales = Object.keys( simulation.localizedSimulations );
    await gitCheckout( simName, `${project.version.major}.${project.version.minor}` );
    screenNameObject[ simName ] = await parseScreenNames( simName, locales, '..' );
    await gitCheckout( simName, 'main' );
  }

  return screenNameObject;
};
