#!/bin/bash
#====================================================================================================
#
# Runs git push if there are any unpushed commits on any branch.  Used by the push-parallel.sh script.
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#====================================================================================================

#if [[ $(git log origin/master..master) ]]; then
# Detect unpushed commits on any branch, see https://stackoverflow.com/a/3338774/1009071
if [[ $(git log --branches --not --remotes --simplify-by-decoration --decorate --oneline) ]]; then
      echo $PWD
      git push
fi