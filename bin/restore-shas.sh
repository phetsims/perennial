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
  echo "usage: `basename $0` [logfile]"
  exit 1
fi

# default logfile
logFile=${HOME}/.phet/print-shas.out

# get log file from command line or use default
if [ $# = 1 ]; then
  logFile=${1}
fi

# verify that logfile exists
if [ ! -f ${logFile} ]; then
    echo "log file does not exist: ${logFile}"
    exit 1
fi

# get path to working directory
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..

# for each repo, checkout the sha specified in logfile
cat ${logFile} | while read -r line; do

  # format of print-shas.sh output is "{{repo}} {{sha}}"
  repo=`echo ${line} | cut -d' ' -f1`
  sha=`echo ${line} | cut -d' ' -f2`

  cd ${workingDir}/${repo}
  git checkout ${sha}
done