
# Overview of the automated maintenance process

## Terminology

- Release Branch: A specific "sim", "branch", "brands" combination that will be patched/deployed as one unit. Sometimes
  this term will be used to refer specifically to the branch itself (ignoring the brands), and sometimes the brands will
  be assumed.
- Patch: A logical change to a specific repository that needs to be made. Sometimes changes for an issue will result in
  multiple "patches" if it affects multiple repositories.
- Patch SHA: A particular git SHA that can be cherry-picked to a patch's repo. Usually a patch will have multiple SHAs,
  and the patch will be "applied" by trying to cherry-pick those SHAs into different versions of the repo for multiple
  release branches.
- Common repo: Generally for any simulation, a common repo is any repository that is a dependency (not the sim
  itself. Notably for simulations like molecule-shapes-basics, it has a "common repo" molecule-shapes that it depends on
  (even though molecule-shapes is a simulation repo in its own right). How molecule-shapes will be handled (in the
  context of molecule-shapes-basics) acts exactly as a normal common repo.
- Common repo branch: a branch on a common repo that is explicitly for storing the SHA of a version of it needed for a
  release branch. For example, there may be a `scenery` branch named `molarity-1.2` which will be the version of
  `scenery` needed by `molarity`'s' `1.2` release branch.

## The REPL

Most maintenance actions are done in a REPL. It operates basically like a Node.js prompt (if you type just `node` at the
command line), or like Chrome's command-line tools. You can assign global variables and do assorted operations.

To open up the maintenance REPL:

1. Make sure you have perennial's node_modules (`npm prune` and `npm update` under perennial).
2. Run `grunt maintenance`.

It will open a prompt with `maintenance>` (to let you know you are in the maintenance REPL).

This exposes a few additional global objects, such as `Maintenance` and `ReleaseBranch` (a helper object). It also
exposes a global boolean `verbose` (default false), such that if it is set to true (`verbose = true;`) then it will
display more information (particularly for debugging issues).

## Release branches

It's good to understand how release branches work for most of this process. A release branch is determined by a
simulation-branch pair, e.g. `molarity` and `1.2` (thus there is a branch named `1.2` in the sim repo `molarity`).

The release branch's latest version is stored in the `package.json` (on the branch). This version is used for
auto-incrementing the version numbers. Release branches should NOT currently have anything like `dev` versions, and
will either show an `rc` version or will have no test type (e.g. `1.2.3` or `1.2.3-rc.2`). If the version shows that
a production version (e.g. `1.2.3`) was last released, the process will bump the maintenance version (e.g. to `1.2.4`),
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

## General procedure

Before starting:

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
5. Create patches for each repo that needs to change, e.g. `Maintenance.createPatch( '{{REPO}}', '{{ISSUE_URL}}' )`.
6. Mark which release branches need which patches. For simple cases, this can just be something like
   `Maintenance.addNeededPatchesAfter( '{{REPO}}', '{{SHA}}' )`, but things can be added dynamically or through filters.
7. Loop the following until no more release branches need patches:
  1. Pick a release branch that needs a patch and check it out: `Maintenance.checkoutBranch( '{{REPO}}', '{{BRANCH}}' )`
  2. Make the changes to the repos that need changes, commit them, and record the SHAs.
  3. Call `Maintenance.addPatchSHA( '{{REPO}}', '{{SHA}}' )` for every SHA.
  4. Apply the cherry-picked SHAs to see if there are any more remaining release branches that need the patch:
     `Maintenance.applyPatches()`. NOTE: The commits are still ONLY LOCAL. This is very fast, but the changes have not
     been made to the remote release branch until the updateDependencies task below.
8. Run `Maintenance.updateDependencies()` (takes a while) which builds the release branches, integrates the commits
   and patches, creates/updates branches where necessary, etc.

Once that is done for every issue, then generally RCs are deployed with `Maintenance.deployReleaseCandidates()`, a list
for QA is generated with `Maintenance.linkList()`, and an RC testing issue is created. If phet-io sims are involved,
generally an issue will be made in special-ops with the actual links (and a qa issue will link to it).

Once RC testing is complete, `Maintenance.deployProduction()` is run, and `Maintenance.linkList()` can be used to
verify that the production deploys completed successfully.

Below will be detailed information about all of the general steps, and all of the related commands. Usually running
`Maintenance.list()` often to see the current state is recommended.

https://github.com/phetsims/special-ops/blob/master/firefox-google-analytics-maintenance-example.md shows an example of
this general setup being followed (two issues, one simple and one complicated).

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

1. Anyone has any release branches that have not yet been published. They won't be handled manually by this process.
   You'll want to coordinate with the responsible developer to patch in the changes you're making (if necessary), and
   you'll want to inform QA that they should test specifically for this issue (they usually do anyways).
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
restriction mentioned above and complete it, THEN create a patch for all sims WITH the restriction. More detail will
be below.

## #5: Create a patch: `Maintenance.createPatch( repo, message )`

This should be called for each repository that will need to have code changes (generally common repos). For the message,
it should almost always include the issue URL used for tracking the maintenance release, and can also contain
additional information if desired. It will be included in commit messages, QA reports, etc.

Running `Maintenance.list()` afterwards should show the patch in maintenance state, e.g.:

```
[scenery] https://github.com/phetsims/scenery/issues/837
```

