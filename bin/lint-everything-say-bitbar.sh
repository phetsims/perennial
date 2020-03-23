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

grunt lint-everything

## get status ##
status=$?

## see https://gist.github.com/rxaviers/7360908
if [ $status -eq 0 ]
then
  result=':green_heart:'
else
  result=':fire'
fi

echo "GOT RESULT"
echo $result

value=$(<~/bitbar-data/status.txt)
echo "$value"
if [ $result = $value ]
then
  echo "same status"
else
  echo "different status"
  say $result
fi

echo $result > ~/bitbar-data/status.txt

# https://github.com/matryer/bitbar/issues/331
open -g bitbar://refreshPlugin?name=*