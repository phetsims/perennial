#!/bin/bash
#=======================================================================================
#
# Prints shas for all repos in the working directory.
#
# Author: Chris Malley (PixelZoom, Inc.)
#
#=======================================================================================

binDir=`dirname "${BASH_SOURCE[0]}"`
workingDir=${binDir}/../..
cd ${workingDir}

for repo in `ls -1`
do
  # if it's a Git repository...
  if [ -d $repo/.git ]; then
    cd $repo > /dev/null

    # format is "{{repo}} {{sha}}"
    echo "$repo `git rev-parse HEAD`"
    cd .. > /dev/null
  fi
done