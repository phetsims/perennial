# Common Release Branch Maintenance

This document describes the common procedures for applying patches to simulation release branches.
See automated-maintenance-process.md for more details about the overall maintenance process (especially if something
goes wrong).

## Prerequisites

Once before starting to work on a release branch, ensure that the branches are synchronized and in working order.
If you are going to be making multiple patches (over days/weeks), this won't generally be needed after the first time

First pull all branches (so everything will be up-to-date):

```sh
cd perennial
grunt sync --allBranches
```

Then verify that the current release branches are in working order:

```sh
cd perennial
grunt maintenance
```

and then in the maintenance terminal (once for each release branch, e.g. molecule-shapes):

```js
Maintenance.checkBranchStatus( rb => rb.repo === 'molecule-shapes' );
```

This should print out something like:

```
molecule-shapes 1.6
Checks completed
```

if successful. If there are warnings, talk to JO/MK about how to proceed.

Additionally, make sure no other developers are doing maintenance patches on the same release branches at the same time,
to avoid conflicts.

## Single Simulation - Patching Simulation

e.g. molecule-polarity 1.3 (commit is for molecule-polarity)

Here, the maintenance tooling doesn't really help. Just cherry-pick and push directly:

```sh
cd molecule-polarity
git checkout 1.3
git pull # if there are potentially changes since last sync
git cherry-pick <SHA>
git push origin 1.3
git checkout main
```

## Single Simulation - Patching Common Repo

e.g. molecule-polarity 1.3 (commit is for scenery)

```sh
cd perennial
grunt maintenance
```

and in the maintenance terminal:

```js
Maintenance.reset()
Maintenance.createPatch( 'scenery', '<ISSUE LINK>' );
Maintenance.addNeededPatch( 'molecule-polarity', '1.3', 'scenery' );
Maintenance.addPatchSHA( 'scenery', '<SHA>' );
Maintenance.applyPatches();
Maintenance.updateDependencies();
```

## Suite of Simulations - Patching "Primary/Mothership" Simulation

e.g. molecule-shapes 1.3 and molecule-shapes-basics 1.3 (molecule-shapes-basics depends on molecule-shapes)

This will need a combination of the above two methods:

First patch molecule-shapes directly:

```sh
cd molecule-shapes
git checkout 1.3
git pull # if there are potentially changes since last sync
git cherry-pick <SHA>
git push origin 1.3
git checkout main
```

Then patch molecule-shapes-basics using maintenance tooling:

```sh
cd perennial
grunt maintenance
```

and in the maintenance terminal:

```js
Maintenance.reset()
Maintenance.createPatch( 'molecule-shapes', '<ISSUE LINK>' );
Maintenance.addNeededPatch( 'molecule-shapes-basics', '1.3', 'molecule-shapes' );
// Add in other release branches as needed here, with similiar "addNeededPatch" commands". NOTE: NOT the primary sim!
Maintenance.addPatchSHA( 'molecule-shapes', '<SHA>' );
Maintenance.applyPatches();
Maintenance.updateDependencies();
```

## Suite of Simulations - Patching Shared/Common (non-simulation) Repo

e.g. density,buoyancy 1.3 patching density-buoyancy-common

Here, just use the maintenance tooling directly:

```sh
cd perennial
grunt maintenance
```

and in the maintenance terminal:

```js
Maintenance.reset()
Maintenance.createPatch( 'density-buoyancy-common', '<ISSUE LINK>' );
Maintenance.addNeededPatch( 'density', '1.3', 'density-buoyancy-common' );
Maintenance.addNeededPatch( 'buoyancy', '1.3', 'density-buoyancy-common' );
Maintenance.addPatchSHA( 'density-buoyancy-common', '<SHA>' );
Maintenance.applyPatches();
Maintenance.updateDependencies();
```