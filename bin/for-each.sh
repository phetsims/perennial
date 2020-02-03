#!/bin/bash
#====================================================================================================
#
# Visits each repository listed in a file and applies the same command to each.
# If the specified file cannot be found, it will check for a matching file in perennial/data/.
#
# Examples:
#
# // print the working directory of all active repos:
# for-each.sh active-repos pwd
#
# // checkout master for all repos:
# for-each.sh active-repos git checkout master
#
# // you can also string multiple commands together by putting everything inside quotes:
# for-each.sh active-sims "npm install && grunt update"
#
# Author: Sam Reid
# Author: Chris Malley
# Author: Jonathan Olson (from work in grunt-all.sh)
#
#====================================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

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

# run the command in each repository directory
for repository in `cat ${filename} | tr -d '\r' | xargs`
do
  if [ -d "${repository}" ]; then
    echo ${repository}
    (cd ${repository} > /dev/null; eval "${@:2}") # command is all args after the filename
  else
    echo ">>>>>>>>>>>>>>>> MISSING " ${workingDir}/${repository}
  fi
done
