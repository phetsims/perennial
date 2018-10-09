
# The automated maintenance process.

## Terminology

- Release Branch: A specific "sim", "branch", "brands" combination that will be patched/deployed as one unit.
- Patch: A logical change to a specific repository that needs to be made. Sometimes changes for an issue will result in
  multiple "patches" if it affects multiple repositories.
- Patch SHA: A particular git SHA that can be cherry-picked to a patch's repo. Usually a patch will have multiple SHAs,
  and the patch will be "applied" by trying to cherry-pick those SHAs into different versions of the repo for multiple
  release branches.

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

It's good to understand .... TODO TODO TODO

## General procedure

Before starting:

1. Run `Maintenance.checkBranchStatus()` to see if any commits have snuck into release branches that are unanticipated.
2. Communicate with the team about maintenance releases for release branches. If there are release branches that are
   unpublished, they'll need to manually include the fixes. From this point on (until complete), you should be the only
   person touching the release branches.
3. Run `Maintenance.reset()` to clear the maintenance state in preparation for the process.

Generally for each issue that should be fixed, the following outline should be used (there are exceptions for
complications):

1. Learn about the change being applied, and try to anticipate what types of changes will be needed. What repositories
   will need to be patched? (Even if the patch on master was only for 1 repository, other repos might also need to be
   changed if your change depends on newer features). If it exists, having a SHA that does "all" of the changes is nice.
   What types of release branches do you anticipate needing changes?
2. Create patches for each repo that needs to change, e.g. `Maintenance.createPatch( '{{REPO}}', '{{ISSUE_URL}}' )`.
3. Mark which release branches need which patches. For simple cases, this can just be something like
   `Maintenance.addNeededPatchesAfter( '{{REPO}}', '{{SHA}}' )`, but things can be added dynamically or through filters.
4. Loop the following until no more release branches need patches:
  1. Pick a release branch that needs a patch and check it out: `Maintenance.checkoutBranch( '{{REPO}}', '{{BRANCH}}' )`
  2. Make the changes to the repos that need changes, commit them, and record the SHAs.
  3. Call `Maintenance.addPatchSHA( '{{REPO}}', '{{SHA}}' )` for every SHA.
  4. Apply the cherry-picked SHAs to see if there are any more remaining release branches that need the patch:
     `Maintenance.applyPatches()`. NOTE: The commits are still ONLY LOCAL. This is very fast, but the changes have not
     been made to the remote release branch until the updateDependencies task below.
5. Run `Maintenance.updateDependencies()` (takes a while) which builds the release branches, integrates the commits
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

## Checking branch status: `Maintenance.checkBranchStatus()`

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




