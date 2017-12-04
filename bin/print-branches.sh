#!/bin/sh
#====================================================================================================
#
# For each active repository, prints the names of all remote branches.
#
# Author: Chris Malley
#
#====================================================================================================

PERENNIAL_BIN=`dirname "${BASH_SOURCE[0]}"`
WORKING_DIR=${PERENNIAL_BIN}/../..
cd ${WORKING_DIR}

for sim in `cat perennial/data/active-repos | sort | xargs`
do
  if [ -d "$sim" ]; then
    echo $sim
    cd $sim > /dev/null
    git branch -r
    cd ..
  else
    echo ">>>>>>>>>>>>>>>>>>>>>>>> Missing repo: $sim"
  fi
done