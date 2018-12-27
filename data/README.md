
NOTE: These should be regenerated whenever certain flags in package.json (for repos) are modified, e.g. simulation/runnable/accessible/supportedBrands/automatedTestEnabled. 
  To do so, run `grunt generate-data` in perennial, then check in the modified files (although the task will likely commit and push for you).

accessibility (auto-generated) is a list of all repositories that have been outfitted with accessibility like keyboard navigation. Sims in progress are also included in this list.  

active-repos is a list of all repositories that you should have checked out if doing common-code refactoring.

active-runnables (auto-generated) is a list of all repositories that can be built with chipper and launched from an html file.
d
active-sims (auto-generated) is a list of all simulation repositories that can be built with chipper.  Similar to runnables, but doesn't include repos with test code like sun, scenery-phet, etc.

not-lintable (manually-generated) is the list of repos that have no `js` in them, and so can't be linted without 
    encountering an eslint error like "Error: No files matching '{repo}' were found."   
    
phet-io (auto-generated) is the list of all simulations that are instrumented with PhET-iO features. This list is automatically fuzz
    tested and is used by phetmarks to dictate which sims have wrapper links. See 
    [How to Instrument a PhET Simulation](https://github.com/phetsims/phet-io/blob/master/doc/how-to-instrument-a-phet-simulation-for-phet-io.md)
    for more information.

testable-phet-io (auto-generated) - Like phet-io, but ignoring sims with automatedTestEnabled=false

testable-runnables (auto-generated) - Like active-runnables, but ignoring sims with automatedTestEnabled=false