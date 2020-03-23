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

## get status ##
status=$?
echo $status > ~/bitbar-data/status.txt

## see https://gist.github.com/rxaviers/7360908
if [ $status -eq 0 ]
then
  echo :green_heart: > ~/bitbar-data/status.txt
  echo "PASS"
else
  echo :fire: > ~/bitbar-data/status.txt
  echo "FAIL"
fi

# https://github.com/matryer/bitbar/issues/331
open -g bitbar://refreshPlugin?name=*