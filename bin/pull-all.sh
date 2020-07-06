#!/bin/bash
#====================================================================================================
#
# Does a 'git pull --rebase' on every active repo.
# Use -p option to handle each repository in parallel.
#
# Author: Jonathan Olson
#
#====================================================================================================

pullCommand="git pull --rebase"
parallel="false"

# cd to the directory where your git repositories live
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
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

# pull each repository
for repo in `cat perennial/data/active-repos | xargs | tr -d '\r'`
do
  if [ -d "${repo}" ]; then
    echo ${repo}
    cd ${repo} > /dev/null
    if [ ${parallel} == "true" ]; then
      # run in the background
      ${pullCommand} &
    else
      ${pullCommand}
    fi
    cd ..
  fi
done

if [ ${parallel} == "true" ]; then
  # wait for all background tasks to complete
  wait
fi