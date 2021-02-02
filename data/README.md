
NOTE: These should be regenerated whenever certain flags in package.json (for repos) are modified, e.g. simulation/runnable/accessible/supportedBrands. 
  To do so, run `grunt generate-data` in perennial, then check in the modified files (although the task will likely commit and push for you).

active-repos is a list of all repositories that you should have checked out if doing common-code refactoring.

active-runnables (auto-generated) is a list of all repositories that can be built with chipper and launched from an html file.
d
active-sims (auto-generated) is a list of all simulation repositories that can be built with chipper.  Similar to runnables, but doesn't include repos with test code like sun, scenery-phet, etc.

interactive-description (auto-generated) is a list of all repositories that have been outfitted with interactive description like keyboard navigation. Sims in progress are also included in this list.  

phet-io (auto-generated) is the list of all simulations that are instrumented with PhET-iO features. This list is automatically fuzz
    tested and is used by phetmarks to dictate which sims have wrapper links. See 
    [How to Instrument a PhET Simulation](https://github.com/phetsims/phet-io/blob/master/doc/how-to-instrument-a-phet-simulation-for-phet-io.md)
    for more information.

phet-io-state-unsupported - A manually supported list of sims that do not support state, and shouldn't be tested as such. 
Any sim in this list will not have its state wrapper fuzzed on CT.  