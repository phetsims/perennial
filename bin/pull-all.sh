#!/bin/bash
#====================================================================================================
#
# Does a 'git pull --rebase' on every active repo.
# Use -p option to handle each repository in parallel.
#
# Author: Jonathan Olson
#
#====================================================================================================

PULL_COMMAND="git pull --rebase"
PARALLEL="false"

# cd to the directory where your git repositories live
PERENNIAL_BIN=`dirname "${BASH_SOURCE[0]}"`
WORKING_DIR=${PERENNIAL_BIN}/../..
cd ${WORKING_DIR}

# parse command line options
while getopts ":p" opt; do
  case $opt in
    p)
      PARALLEL="true"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit
      ;;
  esac
done

# log the current shas in your working copy, which can be restored using restore-shas.sh
HOME_PHET=${HOME}/.phet/
mkdir -p ${HOME_PHET}
${PERENNIAL_BIN}/print-shas.sh > ${HOME_PHET}/print-shas.out

# pull each repository
for repo in `cat perennial/data/active-repos | xargs | tr -d '\r'`
do
  if [ -d "$repo" ]; then
    cd $repo
    if [ ${PARALLEL} == "true" ]; then
      # run in the background
      ${PULL_COMMAND} &
    else
      echo $repo
      ${PULL_COMMAND}
    fi
    cd ..
  fi
done

if [ ${PARALLEL} == "true" ]; then
  # wait for all background tasks to complete
  wait
fi