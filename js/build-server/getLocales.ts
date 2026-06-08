// Copyright 2017-2026, University of Colorado Boulder

/**
 * @author Matt Pennington (PhET Interactive Simulations)
 */

import constants from './constants.js';
import fs from 'graceful-fs';
import { getSortedVersionDirectories } from './getSortedVersionDirectories.js';
import { parseString } from 'xml2js';
import winston from 'winston';
import { IntentionalPerennialAny, LocalesStringSpecifier, Sim } from '../browser-and-node/PerennialTypes.js';

async function getJsonFromXML( xmlString: string | Buffer ): Promise<IntentionalPerennialAny> {
  return new Promise( ( resolve, reject ) => {
    parseString( xmlString, ( error: Error | null, json: IntentionalPerennialAny ) => {
      if ( error ) {
        reject( error );
      }
      else {
        resolve( json );
      }
    } );
  } );
}

/**
 * Get all of the deployed locales for the latest deployed version of the specified simulation.  This is generally done
 * before publishing a new version so that we can know which locales to rebuild.
 * @param locales - comma separated list of locale codes
 * @param simName - name of the sim, should match GitHub repo name, e.g. "energy-skate-park-basics"
 */
export const getLocales = async ( locales: LocalesStringSpecifier, simName: Sim ): Promise<LocalesStringSpecifier> => {
  let callbackLocales = '';

  if ( locales && locales !== '*' ) {

    // from rosetta
    callbackLocales = locales;
  }
  else {

    // from grunt deploy-production
    const simDirectory = constants.HTML_SIMS_DIRECTORY + simName;
    const versionDirectories = await getSortedVersionDirectories( simDirectory );
    if ( versionDirectories.length > 0 ) {
      const latest = versionDirectories[ versionDirectories.length - 1 ];
      const translationsXMLFile = `${constants.HTML_SIMS_DIRECTORY + simName}/${latest}/${simName}.xml`;
      winston.log( 'info', `path to translations XML file = ${translationsXMLFile}` );
      const xmlString = fs.readFileSync( translationsXMLFile );
      let json;
      try {
        json = await getJsonFromXML( xmlString );
      }
      catch( err ) {
        // TODO https://github.com/phetsims/perennial/issues/167 should we call reject here? what happens when callbackLocales is undefined?
        winston.log( 'error', `error parsing XML, err = ${err}` );
      }
      winston.log( 'info', 'data extracted from translations XML file:' );
      winston.log( 'info', JSON.stringify( json, null, 2 ) );
      const simsArray = json.project.simulations[ 0 ].simulation;
      const localesArray: string[] = [];
      for ( let i = 0; i < simsArray.length; i++ ) {
        localesArray.push( simsArray[ i ].$.locale );
      }
      callbackLocales = localesArray.join( ',' );
    }
    else {
      // first deploy, sim directory will not exist yet, just publish the english version
      callbackLocales = 'en';
    }
  }

  winston.log( 'info', `building locales=${callbackLocales}` );

  return callbackLocales;
};
