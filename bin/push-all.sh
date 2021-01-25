#!/bin/bash
#====================================================================================================
#
# Does an in-series 'git push' on all repos with unpushed commits.
# Use -p option to handle each repository in parallel.
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#====================================================================================================

pullCommand="git push"
parallel="false"

# cd to the directory where your git repositories live
binDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
workingDir=${binDir}/../..
cd ${workingDir}

# parse command line options
while getopts ":p" opt; do
  case ${opt} in
  p)
    parallel="true"
    ;;
  \?)
    echo "Invalid option: -$OPTARG" >&2
    exit
    ;;
  esac
done

# push each repository
for repo in $(cat perennial/data/active-repos | xargs | tr -d '\r'); do
  if [ -d "${repo}" ]; then
    echo ${repo}
    cd ${repo} >/dev/null

    if [[ $(git log origin/master..master) ]]; then
      if [ ${parallel} == "true" ]; then
        # run in the background
        ${pullCommand} &
      else
        ${pullCommand}
      fi
    fi

    cd ..
  fi
done
