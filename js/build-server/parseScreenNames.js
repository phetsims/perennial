// Copyright 2021, University of Colorado Boulder

const axios = require( 'axios' );
const puppeteer = require( 'puppeteer' );
const winston = require( 'winston' );
const assert = require( 'assert' );
const puppeteerLoad = require( '../common/puppeteerLoad' );

/**
 * @param {string} simName
 * @param {string[]} locales - a list of locale codes
 * @returns {Promise.<{}>}
 */
const parseScreenNamesFromSimulation = async ( simName, locales ) => {

  const browser = await puppeteer.launch( {
    args: [
      '--disable-gpu'
    ]
  } );

  const returnObject = {};

  for ( let localeIndex = 0; localeIndex < locales.length; localeIndex++ ) {
    const locale = locales[ localeIndex ];
    try {
      const url = `https://phet.colorado.edu/sims/html/${simName}/latest/${simName}_all.html?locale=${locale}`;
      const result = await puppeteerLoad( url, {
        waitForFunction: 'phet.joist.sim.screens',
        browser: browser,
        evaluate: () => {
          return phet.joist.sim.screens
            .map( screen => screen.name || ( screen.nameProperty && screen.nameProperty.value ) )
            .filter( ( screenName, screenIndex ) => !( screenIndex === 0 && screenName === '\u202aHome\u202c' ) );
        }
      } );
      assert( result !== null, 'must be a list of screen names, not null' );

      returnObject[ locale ] = result;
    }
    catch( e ) {
      winston.log( 'error', `Could not parse screen names from sim: ${e}` );
      e.stack && winston.log( 'error', e.stack );
      browser && await browser.close();

      throw e;
    }
  }

  await browser.close();

  return returnObject;
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
    screenNameObject[ simName ] = await parseScreenNamesFromSimulation( simName, locales );
  }

  return screenNameObject;
};

module.exports = {
  parseScreenNames: async ( simName, locales ) => parseScreenNamesFromSimulation( simName, locales ),
  parseScreenNamesAllSimulations: parseScreenNamesAllSimulations
};