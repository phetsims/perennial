/**
 * This file is to keep track of release Density/Buoyancy 1.2, See https://github.com/phetsims/density-buoyancy-common/issues/418
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 */

( async () => {

  //////////////////////////////////////////////////////////////
  // SORT IMPORTS IN DBC: https://github.com/phetsims/chipper/issues/1462
  m.reset();
  // https://github.com/phetsims/density-buoyancy-common/commit/6ba45b6a5fdbece5cba9590f520571a529697b35
  await m.createPatch( 'density-buoyancy-common', 'https://github.com/phetsims/chipper/issues/1462', 'sortImports' );
  await m.addPatchSHA( 'sortImports', '6ba45b6a5fdbece5cba9590f520571a529697b35' );
  await m.addNeededPatch( 'density', '1.2', 'sortImports' );
  await m.addNeededPatch( 'buoyancy', '1.2', 'sortImports' );
  await m.addNeededPatch( 'buoyancy-basics', '1.2', 'sortImports' );

  await m.applyPatches();
  // nope
  await m.checkoutBranch( 'density', '1.2');
  // git cherry-pick 6ba45b6a5fdbece5cba9590f520571a529697b35
  // three files, manual optimize
  // git add .
  // git cherry-pick --continue
  // f4ba786b73564b570267978acddd231a5758d9c4
  await m.addPatchSHA( 'sortImports', 'f4ba786b73564b570267978acddd231a5758d9c4' );
  await m.updateDependencies();

  ////////////////////////////////////////////


} )();