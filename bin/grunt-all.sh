#!/bin/bash
#====================================================================================================
#
# Runs grunt for all runnables.
# Command-line args are passed through to grunt.
# With no args, this runs the default grunt task (build).
#
# Author: Jonathan Olson
# Author: Chris Malley
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

for runnable in `cat perennial/data/active-runnables | xargs | tr -d '\015'`
do
  if [ -d "${runnable}" ]; then
    echo "${runnable} ..."

    # run grunt from the runnable's directory
    cd ${runnable} > /dev/null

    # executes quickly when everything is up to date
    npm update
     
    # run grunt with command-line args
    grunt ${*}

    # and back to the original directory
    cd ..
  else
    echo ">>>>>>>>>>>>>>>> MISSING " ${runnable}
  fi
done
