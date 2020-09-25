#!/bin/bash
#====================================================================================================
#
# Does an in-series 'git push' on all repos with unpushed commits.
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#====================================================================================================

# cd to the directory where your git repositories live
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

# push each repository
for repo in `cat perennial/data/active-repos | xargs | tr -d '\r'`
do
  if [ -d "${repo}" ]; then
    echo ${repo}
    cd ${repo} > /dev/null

    if [[ $(git log origin/master..master) ]]; then
      git push
    else
      echo "nothing to push"
    fi

    cd ..
  fi
done