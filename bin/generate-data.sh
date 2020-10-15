#!/bin/bash
#=============================================================================================
# This should not be run locally! See generateData.js
# Will run `grunt generate-data` but needs to npm update first, see https://github.com/phetsims/perennial/issues/155
# Author: Michael Kauzmann(PhET Interactive Simulations)
#
#=============================================================================================

git pull
npm prune && npm update
grunt generate-data
