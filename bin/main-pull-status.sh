#!/bin/bash
#====================================================================================================
#
# Forwards to main-pull-status.js, but accessible from the top-level directory (rootDir) and doesn't print
# warnings or extra information.
# @deprecated - TODO: to be deleted in  https://github.com/phetsims/perennial/issues/405

# Author: Jonathan Olson (PhET Interactive Simulations)
#
#====================================================================================================

cd perennial
NODE_OPTIONS=--no-warnings ./bin/sage run js/scripts/main-pull-status.js
