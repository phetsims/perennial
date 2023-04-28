NOTE: These should be regenerated whenever certain flags in package.json (for repos) are modified, e.g.
simulation/runnable/accessible/supportedBrands. To do so, run `grunt generate-data` in perennial, then check in the
modified files (although the task will likely commit and push for you).

active-common-sim-repos (manually maintained) - a list of the "common" repos

active-repos (manually maintained) - a list of all repositories that you should have checked out if doing common-code refactoring.

active-repos-private (manually maintained) - a list of all private GitHub repositories that are possible to ignore when cloning with `-p`.

active-runnables (auto-generated) - a list of all repositories that can be built with chipper and launched from an html
file.

active-sims (auto-generated) - a list of all simulation repositories that can be built with chipper. Similar to
runnables, but doesn't include repos with test code like sun, scenery-phet, etc.

color-profiles (manually maintained) - a vestigial list of outdates color-profile-supporting sims that is only needed so that
phetmarks works on release branches. DO NOT UPDATE. See https://github.com/phetsims/scenery-phet/issues/515#issuecomment-885921345

interactive-description (auto-generated) is a list of all repositories that have been outfitted with interactive
description like keyboard navigation. Sims in progress are also included in this list.

phet-io (auto-generated) is the list of all simulations that are instrumented with PhET-iO features. This list is
automatically fuzz tested and is used by phetmarks to dictate which sims have wrapper links. See the
[PhET-iO Instrumentation Technical Guide](https://github.com/phetsims/phet-io/blob/master/doc/phet-io-instrumentation-technical-guide.md)
for more information.

phet-io-api-stable (auto-generated) is the list of sims that have had a designer involved with the API definition.
PhET-iO API changes within phetioDesigned elements. will trigger a CT error. A sim can be added to this list before 1.0
is published, when its API starts to stabilize. Add `phet["phet-io"].compareDesignedAPIChanges:true` to a
sim's `package.json` to be populated to this list.

phet-io-state-unsupported (manually maintained) - A manually supported list of sims that do not support state, and
shouldn't be tested as
such. Any sim in this list will not have its state wrapper fuzzed on CT.

pixelzoom-repos (manually maintained) - A list of repos for which @pixelzoom is the responsible dev for, see `../phet-info/sim-info/responsible_dev.json` but without the common code repos.

unit-tests (auto-generated) - A list of repos that support qunit tests with a committed harness for testing.

voicing (auto-generated) is the list of all simulations that have the voicing feature. This is noted in package json "
phetFeatures.supportsVoicing".

wrappers (manually maintained) - list of "wrapper suite" wrappers that are published with every PhET-iO build.