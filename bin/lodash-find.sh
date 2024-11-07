#!/bin/bash
#====================================================================================================
#
# Finds usages of lodash in PhET JavaScript source code.
# Prints a list with number of occurrences of each lodash function found.
# This takes a long-ish time to run, so be patient.
# TODO: ASK DEVS: Delete this, https://github.com/phetsims/chipper/issues/1461
#
# Author: Chris Malley (PixelZoom, Inc.)
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

sourceFiles=`find . -name "*.js" -print | grep -v node_modules | grep -v sherpa | grep -v "scenery/snapshots"`

for sourceFile in ${sourceFiles}
do
  # Extract occurrences of _.TOKEN, then trim the leading '_.'
  grep -Eo "_\.[a-zA-Z]*" ${sourceFile} | cut -c 3-
done | sort | uniq -c | sort -bgr
