/**
 * This file is to keep track of release Density/Buoyancy 1.2, See https://github.com/phetsims/density-buoyancy-common/issues/418
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

( async () => {
  const Maintenance = require( '../../js/common/Maintenance.js' );
  const m = Maintenance;

  const setUpPatch = async ( patchName, sha, repo = 'density-buoyancy-common' ) => {
    await m.createPatch( repo, 'for rc.2', patchName );
    await m.addPatchSHA( patchName, sha );
    await m.addNeededPatch( 'density', '1.2', patchName );
    await m.addNeededPatch( 'buoyancy', '1.2', patchName );
    await m.addNeededPatch( 'buoyancy-basics', '1.2', patchName );

    await m.applyPatches();
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
  await setUpPatch( 'exploreGrabDragUsageTracker', '45dc5d2946385141b6406654f3143ab0f8e2a3df' );
  await m.updateDependencies();


} )();