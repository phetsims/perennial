# Overview of the automated maintenance process

## Terminology

- Release Branch: A specific "sim", "branch", "brands" combination that will be patched/deployed as one unit. Sometimes
  this term will be used to refer specifically to the branch itself (ignoring the brands), and sometimes the brands will
  be assumed. A "published/production" release branch is one that has had a production deployment before, and is usually
  in contrast with an "RC" release branch (one that is unpublished, but is out for testing in a release candidate QA
  issue).
- Patch: A logical change to a specific repository that needs to be made. Sometimes changes for an issue will result in
  multiple "patches" if it affects multiple repositories.
- Patch SHA: A particular git SHA that can be cherry-picked to a patch's repo. Usually a patch will have multiple SHAs,
  and the patch will be "applied" by trying to cherry-pick those SHAs into different versions of the repo for multiple
  release branches.
- Needed patch: A reference noting that a certain release branch will need a patch for a given (common) repository.
- Common repo: Generally for any simulation, a common repo is any repository that is a dependency (not the sim itself.
  Notably for simulations like molecule-shapes-basics, it has a "common repo" molecule-shapes that it depends on
  (even though molecule-shapes is a simulation repo in its own right). How molecule-shapes will be handled (in the
  context of molecule-shapes-basics) acts exactly as a normal common repo.
- Common repo branch: a branch on a common repo that is explicitly for storing the SHA of a version of it needed for a
  release branch. For example, there may be a `scenery` branch named `molarity-1.2` which will be the version of
  `scenery` needed by `molarity`'s' `1.2` release branch.

## The REPL

Most maintenance actions are done in a read-evaluate-print loop (REPL). It operates basically like a Node.js prompt (if
you type just `node` at the command line), or like Chrome's command-line tools. You can assign global variables and do
assorted operations.

To open up the maintenance REPL:

1. Make sure you have perennial's node_modules (`npm prune` and `npm update` under perennial).
2. Run `grunt maintenance` from the perennial directory.

It will open a prompt with `maintenance>` (to let you know you are in the maintenance REPL).

This exposes a few additional global objects, such as `Maintenance` and `ReleaseBranch` (a helper object). It also
exposes a global boolean `verbose` (default false), such that if it is set to true (`verbose = true;`) then it will
display more information (particularly for debugging issues).

## Release branches

It's good to understand how release branches work for most of this process. A release branch is determined by a
simulation-branch pair, e.g. `molarity` and `1.2` (thus there is a branch named `1.2` in the sim repo `molarity`).

The release branch's latest version is stored in the `package.json` (on the branch). This version is used for
auto-incrementing the version numbers. Release branches should NOT currently have anything like `dev` versions, and will
either show an `rc` version or will have no test type (e.g. `1.2.3` or `1.2.3-rc.2`). If the version shows that a
production version (e.g. `1.2.3`) was last released, the process will bump the maintenance version (e.g. to `1.2.4`),
and will be a series of RC versions before a production version (e.g. `1.2.4-rc.1`, `1.2.4-rc.2`, ..., `1.2.4` ).
The release branches should always have a RC version deployed between production versions (for at least brief testing).

The exact SHAs of repositories for a release branch are determined by:

- For the sim repo itself, the SHA of the actual branch (HEAD).
- For everything else (common repos), the SHA is stored in the top-level `./dependencies.json` of the actual branch.

So updates to the sim repo itself can be done as actual changes on the branch. Updates to common repositories will
result in updates to the `dependencies.json`.

Notably just creating a commit/SHA on a common repo will not guarantee its continued existence (they get garbage
collected after a certain amount of time), so common repo branches will needed to be created to point to these commits.
The format, given a `{{REPO}}` (the release branch's repository, e.g. `molarity`), `{{BRANCH}}` (the release branch's
branch, e.g. `1.2`) and `{{COMMON_REPO}}` (the common repo, e.g. `scenery`), should be a branch in `{{COMMON_REPO}}`
named `{{REPO}}-{{BRANCH}}` (e.g. a branch named `molarity-1.2` in the `scenery` repo).

The SHA HEAD of these common branches should ALWAYS be equal to the reference in the release branch's dependencies.json.
`Maintenance.checkBranchStatus()` will complain if this is not the case.

It's also helpful to know that the brands of the release branch (which can currently be `phet`, `phet-io`, or both) are
not actually stored in the release branches themselves. They are usually determined by the maintenance processes'
enumeration of `ReleaseBranch` objects, determined from the website's main and phet-io databases (based on what is
published AND will get maintenance releases).

A release branch with multiple brands will still be handled as a single unit (with one update, one deploy, etc.), and
those operations will handle all relevant brands at the same time.

While generally not necessary, you can manually create a `ReleaseBranch` object (for tracking it in maintenance) with
`new ReleaseBranch( repo, branch, brands )`, e.g. `new ReleaseBranch( 'molarity', '1.2', [ 'phet' ] )`. For many
purposes, it can also be helpful to use the async function `Maintenance.getMaintenanceBranches()` to get a list of ALL
release branches that are marked for maintenance (NOTE that it returns a Promise).

## General procedure

NOTE: This is an outline. Details for each step will be listed below in this document.

Before starting, ensure you have a clean working copy, and:

0. This process can take a lot of time, all the while taking over every repo checked out. It may be nice to use separate
   device besides your primary development environment. Or checkout a separate clone of phet repos, and use them for
   this process so that you can still develop while the MR process is occurring.
1. Run `Maintenance.checkBranchStatus()` to see if any commits have snuck into release branches that are unanticipated.
2. Communicate with the team about maintenance releases for release branches. If there are release branches that are
   unpublished, they'll need to manually include the fixes. From this point on (until complete), you should be the only
   person touching the release branches.
3. Run `Maintenance.reset()` to clear the maintenance state in preparation for the process.

Generally for each issue that should be fixed, the following outline should be used (there are exceptions for
complications):

4. Learn about the change being applied, and try to anticipate what types of changes will be needed. What repositories
   will need to be patched? (Even if the patch on master was only for 1 repository, other repos might also need to be
   changed if your change depends on newer features). If it exists, having a SHA that does "all" of the changes is nice.
   What types of release branches do you anticipate needing changes?
5. Create patches for each repo that needs to change,
   e.g. `Maintenance.createPatch( '{{REPO}}', '{{ISSUE_URL}}', '{{OPTIONAL_PATCH_NAME}}' )`.
6. Mark which release branches need which patches. For simple cases, this can just be something like
   `Maintenance.addNeededPatchesAfter( '{{PATCH_NAME}}', '{{SHA}}' )`, but things can be added dynamically or through
   filters.

Then loop the following until no more release branches need patches. NOTE: If you have a "fix" commit SHA, feel free to
skip to step 9 (adding the patch SHA).

7. Pick a release branch that needs a patch and check it
   out: `Maintenance.checkoutBranch( '{{REPO}}', '{{BRANCH}}', OUTPUT_JS=false' )`
8. Make the changes to the repos that need changes, commit them, and record the SHAs.
9. Call `Maintenance.addPatchSHA( '{{PATCH_NAME}}', '{{SHA}}' )` for every SHA.
10. Apply the cherry-picked SHAs to see if there are any more remaining release branches that need the patch:
    `Maintenance.applyPatches()`. NOTE: The commits are still ONLY LOCAL. This is very fast, but the changes have not
    been made to the remote release branch until the updateDependencies task below.

Once that is done (or when you want to make the changes permanent on the server):

11. Run `Maintenance.updateDependencies()` (takes a while) which builds the release branches, integrates the commits and
    patches, creates/updates branches where necessary, etc.

Once that is done for every issue, then generally RCs are deployed with `Maintenance.deployReleaseCandidates()`, a list
for QA is generated with `Maintenance.listLinks()`, and an RC testing issue is created. If phet-io sims are involved,
generally an issue will be made in special-ops with the actual links (and a qa issue will link to it).

Once RC testing is complete, `Maintenance.deployProduction()` is run, and `Maintenance.listLinks()` can be used to
verify that the production deploys completed successfully.

Below will be detailed information about all of the general steps, and all of the related commands. Usually running
`Maintenance.list()` often to see the current state is recommended.

[firefox-google-analytics-maintenance-example.md](https://github.com/phetsims/special-ops/blob/master/doc/firefox-google-analytics-maintenance-example.md)
shows an example of this general setup being followed (two issues, one simple and one complicated).

Also note that if there are multiple required changes to a specific repository, it is best to make all of the changes at
once.

## .maintenance.json

The current state of the maintenance release process is stored at `perennial/.maintenance.json`. This can be manually
inspected / backed up, and potentially modified manually in some cases. Loading the Maintenance REPL loads this file
from disk, and most changes should save it back to disk.

## Viewing current maintenance state: `Maintenance.list()`

When run, this will output the main status of the process. It will first show a list of affected release branches and
associated information, e.g.:

```
area-model-algebra 1.0 phet
  pushedMessages: https://github.com/phetsims/scenery/issues/837
  pendingMessages: https://github.com/phetsims/phetcommon/issues/46
  deps:
    chipper: d08c83778a4dc814dbb852869edc12fcc1e6fd64
    phetcommon: 80d991a2fc3c17f95ae39439f833099b19bcaf92
area-model-decimals 1.0 phet
  pushedMessages: https://github.com/phetsims/scenery/issues/837
  pendingMessages: https://github.com/phetsims/phetcommon/issues/46
  deps:
    chipper: 1fb99a869c0bbe46528c7a2abdd1cf141b3a04ca
    phetcommon: 80d991a2fc3c17f95ae39439f833099b19bcaf92
```

then it will show a list of all patches (with associated information, like patch SHAs and release branches that have not
yet had applied patches), e.g.:

```
[phetcommon] https://github.com/phetsims/phetcommon/issues/46
  9fd76b31b1663de55cac2f67283d9a2063d820a9
    balloons-and-static-electricity 1.4 phet
    equality-explorer 1.0 phet
    equality-explorer-basics 1.0 phet
    equality-explorer-two-variables 1.0 phet
```

This is essentially a pretty-printed version of what is in your `.maintenance.json` file.

## Prerequisites

It is assumed that your `~/.phet/build.json` file will be properly configured so that simulations can be deployed. The
standard developer guide instructions to set this up should be done before beginning the maintenance process. Notably,
it is important that `npm config set save false` and `npm config set package-lock false` should be applied,
so that package files are not changed during npm operations used by the maintenance process. In addition, it is helpful
to set up build server notifications (with `buildServerNotifyEmail` in `~/.phet/build.json`) so that any failed
deployments can be flagged.

# General maintenance steps

## #1: Checking branch status: `Maintenance.checkBranchStatus()`

This command will iterate through all available release branches, and will make a few checks to see whether they are
in a consistent form (all common-code related branches are OK, etc.) and whether there were any commits since the last
time it was released. If it detects any anomalies, it will be printed out. If this is a release branch that has a chance
of being included in the release, it's best to investigate its status.

For example, in a recent maintenance release, I had made commits on release branches that updated README.md which were
not released, so things showed up as:

```
Checking acid-base-solutions 1.2
[acid-base-solutions 1.2] Potential changes (dependency is not previous commit)
[acid-base-solutions 1.2] f53124982815b74f99567be834846bc8a1354364 fe00721f0a8a818a84969c298a91c5a6877bd1d6 9dc4b45dcb25933ff2200cf7f9d5bbd115211398
```

However there was also a more serious issue with a branch where the common-code branch was not correctly set up:

```
[balloons-and-static-electricity 1.2-phetio] Dependency mismatch for phet-io on branch balloons-and-static-electricity-1.2-phetio
```

In this case, I investigated both cases to check (a) the only extra commits were the "safe" ones, and (b) handled the
bad branch issue (in this case, by not doing maintenance releases for that branch then or in the future).

## #2: Communicate with the team about the maintenance release

Generally send a Slack message, and try to find out whether:

1. Anyone has any release branches that have not yet been published. Notify them that the branch will soon be patched
   (and will NOT be automatically deployed) and you'll want to inform QA that they should test specifically for this
   issue (they usually do anyways).
2. Whether anyone is doing (or has recently done) any maintenance work on release branches that hasn't been published or
   cleared by QA yet.

Additionally, try to make it clear that "published release branches" are off-limits for the duration of the maintenance
release process (for people besides you). If someone sneaks in a commit to a release branch, it MAY NOT be caught,
particularly if it gets pushed between the RC and production deployments.

## #3: Get rid of any previous maintenance state: `Maintenance.reset()`

Running `Maintenance.reset()` will fully clear any locally-stored data about any previous maintenance releases. It's
recommended to do this here at the start of any process (and make sure not to call it later in the middle of things).

If any state is needed from a previous maintenance release, feel free to back up the `.maintenance.json` file.

## #4: Gather information about the required changes

It helps to gather information about all the changes that will be required up front, before diving in. The most
important questions I've found useful are the following:

- Is there a specific commit (or commits) that made all of the changes? If so, record it/them down for use later.
  Many times I'll leave all commits open in browser tabs (github.com references) for quick reference. Take a look at
  the affected code in older simulations to see how things have changed. Many times you'll end up needing a few
  completely different implementations, particularly if the affected code was heavily rewritten over time.
- What repositories will be affected? What are the exact dependencies of the code being added/changed? NOTE: there have
  been a number of patches that will only affect one repository (e.g. `scenery`) in recently-published simulations, but
  require changes to a different repository (e.g. `phet-core`) due to use of a feature that did not exist in the
  code-base before a certain date (e.g. browser detection like `platform.mobileSafari`). This doesn't have to be nailed
  down completely at the start, but it is very helpful to know about the general history of any code that may need to
  change.
- What issue will be used to track the changes made for the maintenance release? Feel free to create an issue if there
  is no good candidate. There will be a LOT of commits referencing this issue, so ideally it's something where there is
  no current discussion happening.
- Are you adding files? You'll want to be semi-familiar with the entire history of how we've linted our files. Before a
  certain date, we required all copyright statements start with the year range `2002-` (with one of 3 different end
  years allowed), so code for those sims may need to be backwards-compatible. Our `'use strict';` placement has changed,
  etc.

Due to complications like our linting process (or in general any situation where a SHA can be cherry-picked in one place
and work, but another place and fail), you may want to pre-emptively split the maintenance process into sections where
the cherry-pick will always result in a valid simulation. "Splitting" here means acting like you have multiple different
patches that affect disjoint groups of sims. For example, you would create a patch for all sims WITHOUT the copyright
restriction mentioned above and complete it, THEN create a patch for all sims WITH the restriction. More detail will be
below.

## #5: Create a patch: `Maintenance.createPatch( repo, message, [patchName] )`

This should be called for each repository that will need to have code changes (generally common repos). For the message,
it should almost always include the issue URL used for tracking the maintenance release, and can also contain additional
information if desired. It will be included in commit messages, QA reports, etc. Here is a real-life example:

```
 Maintenance.createPatch( "vibe", "https://github.com/phetsims/vibe/issues/39" )
```

If no patchName is provided, the patch will use the repo as its name. If multiple patches are needed for a single
repository, it's best to create two patches, both with non-default patchNames.

Running `Maintenance.list()` afterwards should show the patch in maintenance state, e.g.:

```
[scenery] https://github.com/phetsims/scenery/issues/837
```

## #6: Adding "needed patches"

Now that the patch references are in the system, you'll want to mark which release branches need which patches.
Sometimes this can be simple (add all release branches, or add release branches that don't include commit X), but it can
also be much more complicated (e.g. build each release branch and determine if it has an issue by inspecting the output)
. The process provides a range of methods for these cases, including both simple/general commands for most usages, but
fine-grained control otherwise.

When a release branch is marked as needing a patch, it will show up in the `Maintenance.list()`, e.g.:

```
john-travoltage 1.5 phet
  needs: joist
states-of-matter 1.1 phet
  needs: joist
[joist] https://github.com/phetsims/joist/issues/525
    john-travoltage 1.5 phet
    states-of-matter 1.1 phet
```

shows the two release branches both need the joist patch in the example above.

Most commands below will scan website metadata (both for phet and phet-io brands) to determine the list of release
branches available. If you need more control, it's possible to grab a reference to
`Maintenance.getMaintenanceBranches()`, or to manually constructor your own `ReleaseBranch` objects.

### Manually adding/removing needed patches

`Maintenance.addNeededPatch( repo, branch, patchName )` will add a single release branch (with brands determined from
the website metadata) as needing a patch for the given `patchName` (in the above example, `joist`). If you need to
manually specify brands, or add release branches that are outside of the normal system,
`Maintenance.addNeededPatchReleaseBranch( releaseBranch, patchName )` will take a `ReleaseBranch` object that you can
manually create, or could get from `Maintenance.getMaintenanceBranches()` if you are using the REPL to enumerate what
will need a maintenance release.

`Maintenance.removeNeededPatch( repo, branch, patchName )` will do the corresponding manual removal. Sometimes it's
easier to add "all" sims and remove ones that are not needed, and this makes it possible.

### Adding ALL needed patches

`Maintenance.addAllNeededPatches( patchName )` will add all release branches as needing a patch, which is helpful if you
just fixed something in master (every sim is guaranteed to NOT have the change).

### Adding/removing filtered needed patches based on a SHA

If you have a specific SHA that is a fix (included in some release branches), you can add/remove simulations that do NOT
have the fix with `Maintenance.addNeededPatchesBefore( patchName, sha )` and
`Maintenance.removeNeededPatchesBefore( patchName, sha )`. This will add/remove release branches that do NOT have the
specific SHA in their history. Note that this may not pick up "related" shas (if it was cherry-picked, or someone
rewrote the commit).

If you have a specific SHA that is where something is broken (i.e. the state at the commit and after is broken), you can
add/remove simulations that have the commit with `Maintenance.addNeededPatchesAfter( patchName, sha )` or
`Maintenance.removeNeededPatchesAfter( patchName, sha )`. This is similar to the above "before" case, but includes the
exact opposite set of release branches (ones that have the SHA in their history).

### Adding/removing filtered needed patches with a predicate function

For more complicated cases (and as the internal implementation used by many of the above commands), you can specify an
asynchronous predicate function (returns a Promise that will resolve as a boolean) to either
`Maintenance.addNeededPatches( patchName, filter )` or `Maintenance.removeNeededPatches( patchName, filter )`. This will
apply the add/remove operation to release branches where `filter( releaseBranch )` returns a Promise that resolves as
truthy.

An example of using this power would be the following (used for determining if a string is in a certain source file):

```
const fs = require( 'fs' );

( async () => {
  for ( let repo of [ 'chipper', 'phetcommon' ] ) {
    await Maintenance.addNeededPatches( repo, async ( releaseBranch ) => {
      await releaseBranch.checkout();
      const gaFile = fs.readFileSync( '../phetcommon/js/analytics/google-analytics.js', 'utf8' );
      return gaFile.includes( 'phet.chipper.queryParameters[ \'phet-app\' ]' );
    } );
  }
} )();
```

It's also possible to build the simulations and inspect output (or even see if it failed) or run other operations.

A helper function for building the release branch and comparing the output is provided as
`Maintenance.addNeededPatchesBuildFilter( patchName, filter )`, where in this case `filter` is given the
`ReleaseBranch` object AND the built simulation output as a string.

## #7: Checking out a "modified" release branch

NOTE: If you have a commit SHA that you'll want to apply, you can skip to step 9 below (adding the patch SHA). Steps 7
and 8 are for creating the SHAs necessary. Steps 7-10 will be looped until there are no more release branches that need
patches.

Instead of using `checkout-shas`, or other chipper/perennial commands to check out a branch during this process, it's
recommended that you use `Maintenance.checkoutBranch( repo, branch, outputJS=false )`. Since we don't update the actual
`dependencies.json` files until later in the process, the "normal" commands would not check out the proper code.

Usually when you have a list of release branches that need to be patched, just pick one and check it out, and get the
SHAs needed for cherry picking from it.

## #8: Create and record "fix" commits

Once you have a specific release branch checked out, you'll want to create the commits to fix the patch or patches. This
can be done by attempting to cherry-pick a SHA (and fixing after the failed merge), or can be done manually by going to
all of the affected repositories, making the code changes necessary, and committing it.

NOTE: Do NOT push these commits. Just record the SHA for each of them for the next step. Until the update dependencies
step, these commits will be stored only locally on your checked-out copy. This is way faster in general, so that the
developer can patch all of the sims quickly, and then let the build/commit/etc. process do all of the slower tasks in
one batch.

## #9: Add the patch SHAs: `Maintenance.addPatchSHA( patchName, sha )`

For each of the SHAs determined as "fixes", those should be added to the patch with
`Maintenance.addPatchSHA( patchName, sha )`. This marks that the given SHA is essentially a "fix" for the patch, and it
will be tried (with cherry-picking) on release branches in future steps.

## #10: Apply patches: `Maintenance.applyPatches()`

This will go through all of the release branches that still need a specific patch, and will "try out" all of the
associated patch SHAs (via cherry-pick) until one is successful.

When the cherry-pick works for a release branch, it will print out something like the following (in addition to removing
the "needed patch"):

```
Checked out phetcommon SHA for area-model-multiplication 1.0
Cherry-pick success for 9fd76b31b1663de55cac2f67283d9a2063d820a9, result is b0c963278cef99e3268a5573823e23d882f12a6e
```

whereas if the cherry-pick doesn't work, you may see something like:

```
Could not cherry-pick 9fd76b31b1663de55cac2f67283d9a2063d820a9
Checked out chipper SHA for beers-law-lab 1.6-phetio
```

These commits will still be local, but it will record the exact SHAs that will be in the updated `dependencies.json`
file once the maintenance process will be complete.

After this runs, it is best to use `Maintenance.list()` to see what release branches still need patches, or if all of
the release branches are ready.

## #11: Update dependencies: `Maintenance.updateDependencies()`

The command `Maintenance.updateDependencies()`, when run, will take all of those "pending" SHA fixes and will update
the `dependencies.json` of the release branches with the given SHAs. This requires building the simulations currently
(which is generally slow), so it takes a while and is now batched into this separate step.

After this is run, all of the commits that were in a detached-HEAD local-only state should now be stored on github
servers. Additionally, the remote state of the release branches (and their `dependencies.json`) should be correct, and
will include the SHAs.

NOTE: It is ideal to keep the computer that this is running on "awake", so the process is not interrupted!
https://support.apple.com/kb/PH25222?locale=en_US may be helpful for this.

There is an uncommon subset of maintenance releases in which you want to update branches, but you don't need to publish
the change to production deploys. Most often this is because the bug fix is not important enough to warrant the QA and
publication cost. In this case, technically this step (updating dependencies) is all you need to get to. That said, it
is still recommended continuing on to deploy RC versions. The reason is so that the next maintenance release process
doesn't get more complicated when these "dangling commits" get noted in `Maintenance.checkBranchStatus()`, and then have
to be tracked down as "acceptable" before proceeding (decision noted
in https://github.com/phetsims/scenery/issues/1271#issuecomment-911960613).

## #12: Notify for unpublished RC branches

For any unreleased branches that were patched, it's best to look for QA issues in e.g.
https://github.com/phetsims/QA/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+%22RC+test%22
and add a comment if it was patched with the issues.

## #13: Deploying RCs and the QA issue: `Maintenance.deployReleaseCandidates()`

NOTE: This will not deploy any unpublished release branches (i.e. if a sim is in RC testing, this process will only
patch it, but will not deploy any RC or production versions).

Running `Maintenance.deployReleaseCandidates()` will deploy release-candidate versions for any release branches that
have maintenance changes since the last deploy (it won't needlessly deploy RCs for branches that didn't change). Like
normal rc deploys, you will need to be on campus or on vpn for this process.

After running this, it's best to create a QA report with `Maintenance.listLinks()`, which will generate a markdown list
of links that should be ready for a QA issue. Generally prepend this with the information about what testing should be
done. I always recommend 10-30 seconds of general testing per sim to make sure nothing is horribly broken. Additionally,
there is almost always testing related to the specific fixed issue (e.g. "does this bad behavior happen still").

`Maintenance.listLinks()` will show both production and release candidate links for release branches that have a
deployed version.

## #14: Deploying changes to production: `Maintenance.deployProduction()`

Once RCs are green-lit for deployment, run `Maintenance.deployProduction()` to deploy production versions to published
release branches.

Afterwards, `Maintenance.listLinks()` will print out links to where the production versions should be. Quickly open all
of these links to make sure the production deploys succeeded.

# Maintenance patches for a suite of sims in RC

Something that comes up when releasing RCs for a suite of sims (e.g. area-model, fractions) is that you'll want to patch
all of the associated simulations at once with a specific common patch (e.g. area-model-common, fractions-common, etc.)
The automated maintenance process makes this way more convenient than patching 4+ sims at a time. For example a recent
maintenance release was essentially typing:

```js
maintenance > Maintenance.reset()
maintenance > Maintenance.createPatch( 'area-model-common', 'https://github.com/phetsims/area-model-common/issues/172' );
// Created patch for area-model-common with message: https://github.com/phetsims/area-model-common/issues/172
maintenance > Maintenance.addNeededPatchReleaseBranch( new ReleaseBranch( 'area-model-algebra', '1.1', [ 'phet' ] ), 'area-model-common' );
// Added patch area-model-common as needed for area-model-algebra 1.1
maintenance > Maintenance.addNeededPatchReleaseBranch( new ReleaseBranch( 'area-model-decimals', '1.1', [ 'phet' ] ), 'area-model-common' );
// Added patch area-model-common as needed for area-model-decimals 1.1
maintenance > Maintenance.addNeededPatchReleaseBranch( new ReleaseBranch( 'area-model-introduction', '1.1', [ 'phet' ] ), 'area-model-common' );
// Added patch area-model-common as needed for area-model-introduction 1.1
maintenance > Maintenance.addNeededPatchReleaseBranch( new ReleaseBranch( 'area-model-multiplication', '1.1', [ 'phet' ] ), 'area-model-common' );
// Added patch area-model-common as needed for area-model-multiplication 1.1
maintenance > Maintenance.addPatchSHA( 'area-model-common', '81283b1e97fae5cd760f69d7a47284c603214697' );
// Added SHA 81283b1e97fae5cd760f69d7a47284c603214697 to patch area-model-common
maintenance > Maintenance.list();
/*
area-model-algebra 1.1 phet
  needs: area-model-common
area-model-decimals 1.1 phet
  needs: area-model-common
area-model-introduction 1.1 phet
  needs: area-model-common
area-model-multiplication 1.1 phet
  needs: area-model-common
[area-model-common] https://github.com/phetsims/area-model-common/issues/172
  81283b1e97fae5cd760f69d7a47284c603214697
    area-model-algebra 1.1 phet
    area-model-decimals 1.1 phet
    area-model-introduction 1.1 phet
    area-model-multiplication 1.1 phet
*/
maintenance > Maintenance.applyPatches();
/*
Checked out area-model-common SHA for area-model-algebra 1.1
Cherry-pick success for 81283b1e97fae5cd760f69d7a47284c603214697, result is 1f66b1367629b6f8e6da61ce6c93f35c5ff35775
Checked out area-model-common SHA for area-model-decimals 1.1
Cherry-pick success for 81283b1e97fae5cd760f69d7a47284c603214697, result is 1f66b1367629b6f8e6da61ce6c93f35c5ff35775
Checked out area-model-common SHA for area-model-introduction 1.1
Cherry-pick success for 81283b1e97fae5cd760f69d7a47284c603214697, result is 1f66b1367629b6f8e6da61ce6c93f35c5ff35775
Checked out area-model-common SHA for area-model-multiplication 1.1
Cherry-pick success for 81283b1e97fae5cd760f69d7a47284c603214697, result is 1f66b1367629b6f8e6da61ce6c93f35c5ff35775
4 patches applied
*/
maintenance > Maintenance.updateDependencies();
// It pushes all of the dependency changes to the release branches, taking a number of minutes
```

Notably, we need to somewhat manually add the release branches, since they can't be detected from the website (they
aren't published!)

# Deprecating "unwanted" unpublished release branches

If a release branch is discontinued (without being published), you can rename the branch to add the suffix
`-deprecated` with the following (with either `${BRANCH}` replaced, or defined in an environment variable:

```sh
git checkout ${BRANCH}
git pull
git branch -m ${BRANCH} ${BRANCH}-deprecated
git push origin :${BRANCH}
git push --set-upstream origin ${BRANCH}-deprecated
git checkout master
```
