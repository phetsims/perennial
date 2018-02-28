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
binDir=`dirname "${BASH_SOURCE[0]}"`
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

# log the current shas in your working copy, which can be restored using restore-shas.sh
phetDir=${HOME}/.phet/
mkdir -p ${phetDir}
${binDir}/print-shas.sh > ${phetDir}/print-shas.out

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