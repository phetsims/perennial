#!/bin/bash
#=======================================================================================
#
# Prints a list of repos in your working copy that are not in active-repos.
# Requires perennial repo to be checked out at the top-level of your working copy,
# and all other repos to be siblings of perennial.
#
# Author: Chris Malley (PixelZoom, Inc.)
#
#=======================================================================================

PERENNIAL_BIN=`dirname "${BASH_SOURCE[0]}"`
WORKING_DIR=${PERENNIAL_BIN}/../..
cd ${WORKING_DIR}

ACTIVE_REPOS=`cat ./perennial/data/active-repos | tr -d '\015'`

for filename in `ls -1 .`
do
  if [ -d $filename/.git ]; then
    found="false"
    for repository in $ACTIVE_REPOS
    do
      if [ "$filename" == "$repository" ]; then
        found="true"
        break
      fi
    done
    if [ "$found" == "false" ]; then
      echo "$filename is not in active-repos"
    fi
  fi
done