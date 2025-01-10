// Copyright 2024, University of Colorado Boulder

/**
 * Prints out a report (with links) for active sims/translation for each locale
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

const localeInfo = require( '../../../chipper/js/data/localeInfo' );
const simMetadata = require( '../common/simMetadata' ).default;
const winston = require( 'winston' );

winston.default.transports.console.level = 'error';

const production = process.argv.includes( '--production' );
const phettest = process.argv.includes( '--phettest' );
const local = process.argv.includes( '--local' );

const limitString = process.argv.find( arg => arg.startsWith( '--limit=' ) );
const limit = limitString ? Number( limitString.substring( '--limit='.length ) ) : Number.POSITIVE_INFINITY;

( async () => {

  const metadata = await simMetadata();

  const simNamesByLocale = {};

  metadata.projects.forEach( project => {
    const simulations = project.simulations;
    if ( simulations.length !== 1 ) {
      throw new Error( 'Expected exactly one simulation per project in metadata' );
    }

    const simulation = simulations[ 0 ];
    const name = simulation.name;
    const locales = Object.keys( simulation.localizedSimulations );

    locales.forEach( locale => {
      if ( !simNamesByLocale[ locale ] ) {
        simNamesByLocale[ locale ] = [];
      }
      simNamesByLocale[ locale ].push( name );
    } );
  } );

  // https://bayes.colorado.edu/dev/phettest/acid-base-solutions/acid-base-solutions_en.html?ea&brand=phet

  const locales = Object.keys( simNamesByLocale ).sort();

  for ( const locale of locales ) {

    console.log( `## ${locale} (${localeInfo[ locale ].name})` );
    console.log( '' );
    simNamesByLocale[ locale ].slice( 0, Math.min( limit, simNamesByLocale[ locale ].length ) ).forEach( simName => {
      const links = [];
      if ( production ) {
        links.push( `[production](https://phet.colorado.edu/sims/html/${simName}/latest/${simName}_all.html?locale=${locale})` );
      }
      if ( phettest ) {
        links.push( `[phettest](https://bayes.colorado.edu/dev/phettest/${simName}/${simName}_en.html?ea&brand=phet&locale=${locale})` );
      }
      if ( local ) {
        links.push( `[local](http://localhost/${simName}/${simName}_en.html?brand=phet&ea&debugger&locale=${locale})` );
      }
      console.log( `- ${simName} ${links.join( ' ' )}` );
    } );
    console.log( '' );
  }
} )();