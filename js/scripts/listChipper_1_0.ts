// Copyright 2018, University of Colorado Boulder

/**
 *  This script searches babel for all translation credits based on history and adds them to the website database
 *  if not previously added.
 *
 *  @author Matt Pennington
 **/

import { getFileAtBranch } from '../common/getFileAtBranch.js';
import winston from '../npm-dependencies/winston.js';
import { Checkout } from '../common/Checkout.js';

// Set to true if you want to ignore release branches that only support phet-io brand.
const PHET_IO_BRAND_TOO = false;

winston.remove( winston.transports.Console ); // No other logging needed
console.log( '' );

( async () => {

  const releaseBranches = await Checkout.getMaintainedReleaseBranches();

  for ( const releaseBranch of releaseBranches ) {

    const chipperPackage = JSON.parse( await getFileAtBranch( releaseBranch.branch, 'chipper/package.json' ) );

    const shouldLog = !chipperPackage.version.startsWith( '2' ) &&
                      ( PHET_IO_BRAND_TOO || releaseBranch.brands.includes( 'phet' ) );
    shouldLog && console.log( releaseBranch.toString() );

  }

} )();