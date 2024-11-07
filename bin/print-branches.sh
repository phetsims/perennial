#!/bin/bash
#====================================================================================================
#
# For each active repository, prints the names of all remote branches.
# TODO: ASK DEVS: Delete this and prefer javascript code, https://github.com/phetsims/chipper/issues/1461
#
# Author: Chris Malley
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

for repo in `cat perennial/data/active-repos | sort | xargs`
do
  # Strip newline from end of repo
  repo=`echo ${repo}`

  if [ -d "${repo}" ]; then
    echo ${repo}
    cd ${repo} > /dev/null
    git branch -r
    cd ..
  else
    echo ">>>>>>>>>>>>>>>>>>>>>>>> Missing repo: ${repo}"
  fi
done