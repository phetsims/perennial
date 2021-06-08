#!/bin/bash
#====================================================================================================
#
# Forwards to master-pull-status.js, but accessible from the top-level directory (rootDir) and doesn't print
# warnings or extra information.
#
# Author: Jonathan Olson (PhET Interactive Simulations)
#
#====================================================================================================

cd perennial
node --no-warnings js/scripts/master-pull-status.js
