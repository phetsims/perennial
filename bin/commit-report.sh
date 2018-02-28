#!/bin/bash
#=============================================================================================
#
# Output a formatted view of recent commits to help in writing a report
# Usage: commit-report.sh username
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#=============================================================================================

binDir=`dirname "${BASH_SOURCE[0]}"`

if [ -z "$1" ]
  then
    echo "Usage: `basename $0` username"
    exit 1
fi

${binDir}/for-each.sh active-repos log.sh $1