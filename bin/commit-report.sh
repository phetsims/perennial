#!/bin/bash
#=============================================================================================
#
# Output a formatted view of recent commits to help in writing a report
# Usage: commit-report.sh author
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#=============================================================================================

# Read author from first command line arg
if [ -z "$1" ]
  then
    echo "Usage: `basename $0` author"
    exit 1
fi
author=$1

# perennial/bin
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# directory that contains your working copies of git repos
rootDir=${binDir}/../../

for repository in `cat ${rootDir}/perennial/data/active-repos | tr -d '\r' | xargs`
do
  echo ${repository}
  cd ${rootDir}/${repository}
  git --no-pager log --all --remotes --since=7.days --author=${author} --pretty=format:"%an %ad %s" --date=relative
  printf "\n\n"
done