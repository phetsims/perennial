#!/bin/bash
#====================================================================================================
#
# Restores shas from a log file that was created using print-shas.sh
#
# To save/restore from a specific log file:
# % print-shas.sh > log
# % restore-shas.sh log
#
# To save/restore from the default log file:
# % pull-all.sh
# % restore-shas.sh
#
# Author: Chris Malley (PixelZoom, Inc.)
#
#====================================================================================================

# verify number of command line args
if [ $# -gt 1 ]; then
  echo "usage: `basename ${BASH_SOURCE[0]}` [logfile]"
  exit 1
fi

# default logfile
LOGFILE=${HOME}/.phet/print-shas.log

# get log file from command line or use default
if [ $# = 1 ]; then
  LOGFILE=${1}
fi

# verify that logfile exists
if [ ! -f ${LOGFILE} ]; then
    echo "log file does not exist: ${LOGFILE}"
    exit 1
fi

# get path to working directory
PERENNIAL_BIN=`dirname "${BASH_SOURCE[0]}"`
WORKING_DIR=${PERENNIAL_BIN}/../..

# for each repo, checkout the sha specified in logfile
cat ${LOGFILE} | while read -r line; do

  # format of print-shas.sh output is "{{repo}} {{sha}}"
  REPO=`echo $line |cut -d' ' -f1`
  SHA=`echo $line |cut -d' ' -f2`

  cd ${WORKING_DIR}/${REPO}
  git checkout ${SHA}
done