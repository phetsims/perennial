// Copyright 2019-2020, University of Colorado Boulder

/**
 * Launch an instance of the simulation using puppeteer, gather the cheerpj resources for optimization.
 * @author Sam Reid (PhET Interactive Simulations)
 */


const puppeteer = require( 'puppeteer' );

module.exports = async url => {

  let runtimeResources = null;

  return new Promise( async ( resolve, reject ) => { // eslint-disable-line no-async-promise-executor

    let receivedResources = false;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on( 'console', async msg => {
      if ( msg.text().indexOf( 'Simulation started...' ) >= 0 ) {
        receivedResources = true;

        runtimeResources = await page.evaluate( () => window.cjGetRuntimeResources() );

        await resolved( runtimeResources );
      }

      else if ( msg.type() === 'error' ) {
        const location = msg.location ? `:\n  ${msg.location().url}` : '';
        const message = msg.text() + location;
        console.error( 'Error from sim:', message );
      }
    } );

    const resolved = async runtimeResources => {
      if ( receivedResources ) {
        await browser.close();
        resolve( runtimeResources );
      }
    };

    page.on( 'error', msg => reject( msg ) );
    page.on( 'pageerror', msg => reject( msg ) );

    try {
      await page.goto( url );
    }
    catch( e ) {
      reject( e );
    }
  } );
};