// Copyright 2021, University of Colorado Boulder
// @author Matt Pennington (PhET Interactive Simulations)

const axios = require( 'axios' );
const getFullStringMap = require( './getFullStringMap' );
const loadJSON = require( '../common/loadJSON' );
const gitCheckout = require( '../common/gitCheckout' );

/**
 * NOTE: release branch NEEDS to be checked out for this to be called, since we'll need the dependencies.json file
 *
 * @param {string} simName
 * @param {string[]} locales - a list of locale codes
 * @param {string} checkoutDir
 * @returns {Promise.<{}>}
 */
const parseScreenNamesFromSimulation = async ( simName, locales, checkoutDir ) => {

  const stringMap = await getFullStringMap( simName, checkoutDir );
  const packageObject = await loadJSON( `${checkoutDir}/${simName}/package.json` );
  const screenNameKeys = packageObject.phet.screenNameKeys || [];

  const localeData = await loadJSON( `${checkoutDir}/babel/localeData.json` );

  const result = {};
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

const parseScreenNamesAllSimulations = async () => {
  const url = 'https://phet.colorado.edu/services/metadata/1.3/simulations?format=json&type=html&summary';
  const projects = ( await axios.get( url ) ).data.projects;

  const screenNameObject = {};

  for ( let projectIndex = 0; projectIndex < projects.length; projectIndex++ ) {
    const project = projects[ projectIndex ];
    const simulation = project.simulations[ 0 ];
    const simName = simulation.name;
    const locales = Object.keys( simulation.localizedSimulations );
    await gitCheckout( simName, `${project.version.major}.${project.version.minor}` );
    screenNameObject[ simName ] = await parseScreenNamesFromSimulation( simName, locales, '..' );
    await gitCheckout( simName, 'main' );
  }

  return screenNameObject;
};

module.exports = {
  parseScreenNames: parseScreenNamesFromSimulation,
  parseScreenNamesAllSimulations: parseScreenNamesAllSimulations
};