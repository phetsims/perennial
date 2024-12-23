// Copyright 2018, University of Colorado Boulder

/**
 *  This script searches babel for all translation credits based on history and adds them to the website database
 *  if not previously added.
 *
 *  @author Matt Pennington
 **/

import getFileAtBranch from '../common/getFileAtBranch.js';
import ReleaseBranch from '../common/ReleaseBranch.js';
import winston from '../npm-dependencies/winston.js';

// Set to true if you want to ignore release branches that only support phet-io brand.
const PHET_IO_BRAND_TOO = false;

winston.remove( winston.transports.Console ); // No other logging needed
console.log( '' );

( async () => {

  const phetBrandSims = await ReleaseBranch.getAllMaintenanceBranches( false );

  for ( const releaseBranch of phetBrandSims ) {

    const dependencies = JSON.parse( await getFileAtBranch( releaseBranch.repo, releaseBranch.branch, 'dependencies.json' ) );
    const chipperPackage = JSON.parse( await getFileAtBranch( 'chipper', dependencies.chipper.sha, 'package.json' ) );

    const shouldLog = !chipperPackage.version.startsWith( '2' ) &&
                      ( PHET_IO_BRAND_TOO || releaseBranch.brands.includes( 'phet' ) );
    shouldLog && console.log( releaseBranch.toString() );

  }

} )();