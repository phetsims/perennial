NOTE: These should be regenerated whenever certain flags in package.json (for repos) are modified, e.g.
simulation/runnable/accessible/supportedBrands. To do so, run `grunt generate-data` in perennial, then check in the
modified files (although the task will likely commit and push for you).

**active-common-sim-repos (manually maintained)** - a list of the "common" repos used to run simulations.

**active-repos (manually maintained)** - a list of all repositories that you should have checked out if doing
common-code refactoring.

**active-repos-private (manually maintained)** - a list of all private GitHub repositories that are possible to ignore
when cloning with `-p`.

**active-runnables (auto-generated)** - a list of all repositories that can be built with chipper and launched from an
html file.

**active-scenerystack-repos (manually maintained)** - a supset of active-repos that exist in the `scenerystack` org 
instead of `phetsims`.

**active-sims (auto-generated)** - a list of all simulation repositories that can be built with chipper. Similar to
runnables, but doesn't include repos with test code like sun, scenery-phet, etc.

**active-website-repos (manually maintained)** - the list of repos required by the website development team for website.
You will also need `perennial`, though it isn't in this list.

**color-profiles (manually maintained)** - a vestigial list of outdates color-profile-supporting sims that is only
needed so that phetmarks works on release branches. DO NOT UPDATE.
See https://github.com/phetsims/scenery-phet/issues/515#issuecomment-885921345

**interactive-description (auto-generated)** - is a list of all repositories that have been outfitted with interactive
description like keyboard navigation. Sims in progress are also included in this list.

**npm-update (manually maintained)** - lists the repos that need to have npm dependencies maintained in order for core
codebase functionality to work on main. For example if type-checking won't pass until the repo is npm-installed. This
list does not include sim repos or any repos that require npm install only for `grunt` to work correctly.

**phet-io (auto-generated)** - is the list of all simulations that are instrumented with PhET-iO features. This list is
automatically fuzz tested and is used by phetmarks to dictate which sims have wrapper links. See the
[PhET-iO Instrumentation Technical Guide](https://github.com/phetsims/phet-io/blob/main/doc/phet-io-instrumentation-technical-guide.md)
for more information.

**phet-io-api-stable (auto-generated)** - is the list of sims that have had a designer involved with the API definition.
PhET-iO API changes within phetioDesigned elements. will trigger a CT error. A sim can be added to this list before 1.0
is published, when its API starts to stabilize. Add `phet["phet-io"].compareDesignedAPIChanges:true` to a sim's
`package.json` to be populated to this list.

**phet-io-hydrogen.json (manually maintained)** - the list of sim/version combos of published sims that are part of the
PhET-iO Hydrogen feature-set.

**phet-io-state-unsupported (manually maintained)** - A manually supported list of sims that do not support state, and
shouldn't be tested as such. Any sim in this list will not have its state wrapper fuzzed on CT.

**unit-tests (auto-generated)** - A list of repos that support qunit tests with a committed harness for testing.

**voicing (auto-generated)** - is the list of all simulations that have the voicing feature. This is noted in package
json "phetFeatures.supportsVoicing".

**website-git-flow-repos (manually maintained)** - List of website repos that require special management for releasing 
the phet website. All repos in this list MUST be in active-website-repos.

**wrappers (manually maintained)** - list of PhET-iO "wrapper suite" wrappers that are published with every PhET-iO build.