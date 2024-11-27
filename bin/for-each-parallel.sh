#!/bin/bash
#====================================================================================================
#
# Visits each repository listed in a file and applies the same command to each in parallel.
# See for-each.sh for the serial version.
#
# Examples:
#
# // revert working copy changes in all repos:
# for-each-parallel.sh active-repos "git checkout ."
#
# Author: Sam Reid (PhET Interactive Simulations)
# Author: Chris Malley
# Author: Jonathan Olson
#
#====================================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

# Maximum number of concurrent processes
MAX_CONCURRENT_PROCESSES=16

# verify number of command line args
if [ $# -lt 2 ]; then
  echo "usage: `basename $0` filename command"
  exit 1
fi

# remember the directory where the script was run
runDir=`pwd`

# cd to working directory
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}
workingDir=`pwd` # clean up the path, since it appears in error messages

# filename is the first arg
filename=${1}
if [ "${filename:0:1}" != "/" ]; then

  # relative path
  filename=${runDir}/${1}

  # if the relative path doesn't exist, default to perennial/data/
  if [ ! -e ${filename} ]; then
    filename=${workingDir}/perennial/data/${1}
  fi
fi

# verify that input file exists
if [ ! -e ${filename} ]; then
  echo "${1} does not exist"
  exit 1
fi

# Function to run the command in each repository directory
run_command() {
  repository=$1
  if [ -d "${repository}" ]; then
    # echo ${repository}
    # Suppress "Updated 0 paths from the index" by redirecting stderr of the command to /dev/null
    # This output is common during "git checkout ." and does not indicate a problem
    (cd ${repository} > /dev/null; eval "${@:2}" 2> >(grep -v 'Updated 0 paths from the index' >&2))
  else
    echo ">>>>>>>>>>>>>>>> MISSING " ${workingDir}/${repository}
  fi
}

# Export the function and necessary variables for parallel execution
export -f run_command
export workingDir

# Run the command in each repository in parallel, limiting the number of concurrent processes
cat ${filename} | tr -d '\r' | xargs -n 1 -P $MAX_CONCURRENT_PROCESSES -I {} bash -c "run_command '{}' ${@:2}"