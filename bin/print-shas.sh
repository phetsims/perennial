#!/bin/bash
#=======================================================================================
#
# Prints shas for all repos in the working directory.
#
# Author: Chris Malley (PixelZoom, Inc.)
#
#=======================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

for repo in `ls -1`
do
  # Strip newline from end of repo
  repo=`echo ${repo}`

  # if it's a Git repository...
  if [ -d ${repo}/.git ]; then
    cd ${repo} > /dev/null

    # format is "{{repo}} {{sha}}"
    echo "${repo} `git rev-parse HEAD`"
    cd .. > /dev/null
  fi
done