/**
 * This file is to keep track of release Density/Buoyancy 1.2, See https://github.com/phetsims/density-buoyancy-common/issues/418
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

( async () => {
  const Maintenance = require( '../../js/common/Maintenance.js' );
  const m = Maintenance;

  const getPatchName = ( repo, sha ) => repo + sha;
  /**
   * TODO: what if the sha to cherry pick isn't pushed? https://github.com/phetsims/perennial/issues/365
   * TODO: what if my cwd isn't perennial/ do things work correctly in the maintenance tooling? https://github.com/phetsims/density-buoyancy-common/issues/401
   */
  const cherryPickSHA = async ( repo, sha ) => {
    const patchName = getPatchName( repo, sha );
    await m.createPatch( repo, 'for rc.2', patchName );
    await m.addPatchSHA( patchName, sha );
    await m.addNeededPatch( 'density', '1.2', patchName );
    await m.addNeededPatch( 'buoyancy', '1.2', patchName );
    await m.addNeededPatch( 'buoyancy-basics', '1.2', patchName );

    const success = await m.applyPatches(); // could also throw
    if ( success ) {
      await m.updateDependencies();
    }
    else {
      console.log( 'Change not cherry picked to all repos; dependencies not updated' );
    }

    return success;
  }

  //////////////////////////////////////////////////////////////
  // SORT IMPORTS IN DBC: https://github.com/phetsims/chipper/issues/1462
  // m.reset();
  // // https://github.com/phetsims/density-buoyancy-common/commit/6ba45b6a5fdbece5cba9590f520571a529697b35
  // await m.createPatch( 'density-buoyancy-common', 'https://github.com/phetsims/chipper/issues/1462', 'sortImports' );
  // await m.addPatchSHA( 'sortImports', '6ba45b6a5fdbece5cba9590f520571a529697b35' );
  // await m.addNeededPatch( 'density', '1.2', 'sortImports' );
  // await m.addNeededPatch( 'buoyancy', '1.2', 'sortImports' );
  // await m.addNeededPatch( 'buoyancy-basics', '1.2', 'sortImports' );
  //
  // await m.applyPatches();
  // // nope
  // await m.checkoutBranch( 'density', '1.2');
  // // git cherry-pick 6ba45b6a5fdbece5cba9590f520571a529697b35
  // // three files, manual optimize
  // // git add .
  // // git cherry-pick --continue
  // // f4ba786b73564b570267978acddd231a5758d9c4
  // await m.addPatchSHA( 'sortImports', 'f4ba786b73564b570267978acddd231a5758d9c4' );
  // await m.updateDependencies();

  ////////////////////////////////////////////
  // Fix mass interrupting and reset/focus handling for https://github.com/phetsims/density-buoyancy-common/issues/399
  // Maintenance.loadAllMaintenanceBranches();
  // m.reset();
  // await m.createPatch( 'density-buoyancy-common', 'https://github.com/phetsims/density-buoyancy-common/issues/399', 'massReset' );
  // await m.addPatchSHA( 'massReset', '5d5dc60ef63906207978e0473603950372c3f5fc' );
  // await m.addNeededPatch( 'density', '1.2', 'massReset' );
  // await m.addNeededPatch( 'buoyancy', '1.2', 'massReset' );
  // await m.addNeededPatch( 'buoyancy-basics', '1.2', 'massReset' );
  // await m.applyPatches();
  // await m.updateDependencies();


  ////////////////////////////////////////////////////////
  // interrupt boat on scene reset https://github.com/phetsims/density-buoyancy-common/issues/410
  // https://github.com/phetsims/density-buoyancy-common/commit/729551166f916f180ed428db2761ee4bff26dd2a
  // await setUpPatch( 'interruptBoatAndBlock', '729551166f916f180ed428db2761ee4bff26dd2a' );
  // m.applyPatches()
  // m.updateDependencies();

  ////////////////////////////////////////////////////////
  // Fix memory leak: https://github.com/phetsims/density-buoyancy-common/issues/395
  // await setUpPatch( 'disposeKeyboardListener', '1d6d8d570d34b085ab1be3784a0803ae7d82415f', 'scenery-phet' );
  // await m.updateDependencies();

  ////////////////////////////////////////////////////////
  // Fix max width for fallback text, see https://github.com/phetsims/density-buoyancy-common/issues/394
  // await setUpPatch( 'maxWidthFallbackText', '234443020a88a811a2c932ac0fb83d4d6ba2a85d' );
  // await m.updateDependencies();

  ////////////////////////////////////////////////////////
  // densityNumberControl visibleProperty wire, see https://github.com/phetsims/density-buoyancy-common/issues/415
  // https://github.com/phetsims/density-buoyancy-common/commit/7cb3bd8a1e1115b5f3652be3508ba1f0d6a2b09c
  // await setUpPatch( 'densityNumberControlVisibleProperty', '7cb3bd8a1e1115b5f3652be3508ba1f0d6a2b09c' );
  // await m.updateDependencies();

  ////////////////////////////////////////////////////////
  // B:B explore share usageTracker https://github.com/phetsims/density-buoyancy-common/issues/397
  // https://github.com/phetsims/density-buoyancy-common/commit/45dc5d2946385141b6406654f3143ab0f8e2a3df
  // await setUpPatch( 'exploreGrabDragUsageTracker', '45dc5d2946385141b6406654f3143ab0f8e2a3df' );
  // await m.updateDependencies();

  // https://github.com/phetsims/density-buoyancy-common/issues/405
  // Avoid cascading density property changes from "hidden" fluids to the custom fluid density

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/416
  // await cherryPickSHA( 'density-buoyancy-common', '168b9a3be8daef085a09b129060d087cabcf6f2e' );

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/414
  // await cherryPickSHA( 'density-buoyancy-common', 'b18c2378b02ee013c8d04ec6d396a74702f324bb' );

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/417
  // const one = await cherryPickSHA( 'density-buoyancy-common', '3bc283c608f96c20bada618bf0c1ceeb07646d9f' );
  // const two = await cherryPickSHA( 'scenery-phet', '7f08bd500902559c26f3a6b92283a50acc85d758' );
  // if ( one && two ) {
  //   await m.updateDependencies();
  // }
  // else {
  //   console.log( 'Change not cherry picked to all repos; dependencies not updated' );
  // }

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/411
  // const one = await cherryPickSHA( 'density-buoyancy-common', 'b0a4aa3bcef247fb6f0bd7978f43467fd686d11f' );
  // const two = await cherryPickSHA( 'phet-io-sim-specific', '4177139573f13d2f281b8decfc75e8708e3df806' );
  // if ( one && two ) {
  //   await m.updateDependencies();
  // }
  // else {
  //   console.log( 'Change not cherry picked to all repos; dependencies not updated' );
  // }

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/409
  // await cherryPickSHA( 'density-buoyancy-common', 'd3648da52b1ac9bf461524dc5f3095cbf162988d' );

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/404
  // await cherryPickSHA( 'density-buoyancy-common', 'b304fb3615f252b35f994cc0280fe18fa99b7340' );
  // await cherryPickSHA( 'density-buoyancy-common', 'b304fb3615f252b35f994cc0280fe18fa99b7340' );

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/400
  // const one = await cherryPickSHA( 'phet-io-sim-specific', '1db630b84ba7b55be0e4f0dc2c1b4bea9c9e28c2' );
  // const two = await cherryPickSHA( 'phet-io-sim-specific', '8591a10f7b8321b01c3f944d4553df08dac3ccb1' );
  // if ( one && two ) {
  //   await m.updateDependencies();
  // }
  // else {
  //   console.log( 'Change not cherry picked to all repos; dependencies not updated' );
  // }

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/400
  // const one = await cherryPickSHA( 'phet-io-sim-specific', '1db630b84ba7b55be0e4f0dc2c1b4bea9c9e28c2' );
  // const two = await cherryPickSHA( 'phet-io-sim-specific', '8591a10f7b8321b01c3f944d4553df08dac3ccb1' );
  // if ( one && two ) {
  //   await m.updateDependencies();
  // }
  // else {
  //   console.log( 'Change not cherry picked to all repos; dependencies not updated' );
  // }
  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/404
  // await cherryPickSHA( 'phet-io-sim-specific', '5c20b634f709527ea5836c00735bdfe8fe8b90f4' );
  // Didn't work, manual cherry picks needed
  // git checkout phet-io-sim-specific@49eb85d1965837d604eac643e56fea6370dd07ec
  // git cherry-pick 5c20b634f709527ea5836c00735bdfe8fe8b90f4
  // manually fix -> 6d28aa30163993447d61e3508b16cf5e80bbcedd
  // const patchName = getPatchName( 'phet-io-sim-specific', '5c20b634f709527ea5836c00735bdfe8fe8b90f4' );
  // m.addPatchSHA( patchName, '6d28aa30163993447d61e3508b16cf5e80bbcedd' )
  // m.applyPatches();
  // m.updateDependencies();

  //////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/412
  // const one = await cherryPickSHA( 'density-buoyancy-common', 'ce5902d3b2ad8a7742ec80fee9d58a3ca3f116e0' );
  // const two = await cherryPickSHA( 'density-buoyancy-common', '289819c99bf316237fede18b5baea84613263e5e' );
  // if ( one && two ) {
  //   await m.updateDependencies();
  // }
  // else {
  //   console.log( 'Change not cherry picked to all repos; dependencies not updated' );
  // }

  ////////////////////////////////////////////////////////
  // First four in https://github.com/phetsims/density-buoyancy-common/issues/420
  // await cherryPickSHA( 'density-buoyancy-common', 'a91ec7fd98bf30406ba9a5ac6f4050cbef3163b9' );
  // await cherryPickSHA( 'density-buoyancy-common', '30bcbfe85d82d51b0a392defc6af8630e668e0e4' );
  // await cherryPickSHA( 'density-buoyancy-common', '3cf771b66368b6578e59439a36e1a2042fe84fc2' );
  // await cherryPickSHA( 'density-buoyancy-common', '5388f8b4582318579fa6b30957d697dda507ad70' );
  // await m.updateDependencies();

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/404
  // await cherryPickSHA( 'density-buoyancy-common', 'b3d9f6c35467cd837bb11fa9d83527c06f645957' );

  ////////////////////////////////////////////////////////
  // https://github.com/phetsims/density-buoyancy-common/issues/401
  // await cherryPickSHA( 'phet-io-sim-specific', '415f7dc793e8051f3e68b60977eba8029bf29152' );
  // Did not work, manually cherry pick and get the below sha.
  // await m.addPatchSHA( 'phet-io-sim-specific415f7dc793e8051f3e68b60977eba8029bf29152', 'b50782b7cc88d5a5e665b6e3c2d6d420f616ef3d')
  //
} )();