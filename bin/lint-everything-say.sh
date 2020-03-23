#!/bin/sh
#==================================================================================
#
# Runs 'grunt lint-everything --say".  Developed for usage with fswatch like so:
# cd perennial/
# fswatch ../ -e ".*" -i "\\.js$" --one-per-batch | xargs -n1 ~/apache-document-root/main/perennial/bin/lint-everything-say.sh
#
# Usage: checkout-branch.sh branchName
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#==================================================================================

grunt lint-everything --say