#!/bin/bash
#====================================================================================================
#
# Forwards to main-pull-status.js, but accessible from the top-level directory (rootDir) and doesn't print
# warnings or extra information.
#
# Author: Jonathan Olson (PhET Interactive Simulations)
#
#====================================================================================================

cd perennial
node --no-warnings js/scripts/main-pull-status.js
