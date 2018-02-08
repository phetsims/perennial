#!/bin/sh
#====================================================================================================
#
# For each active repository, prints the names of all remote branches.
#
# Author: Chris Malley
#
#====================================================================================================

binDir=`dirname "${BASH_SOURCE[0]}"`
workingDir=${binDir}/../..
cd ${workingDir}

for repo in `cat perennial/data/active-repos | sort | xargs`
do
  if [ -d "${repo}" ]; then
    echo ${repo}
    cd ${repo} > /dev/null
    git branch -r
    cd ..
  else
    echo ">>>>>>>>>>>>>>>>>>>>>>>> Missing repo: ${repo}"
  fi
done