#!/bin/bash
#=======================================================================================
#
# Reverts working copy to a specified date by checking out last SHA before a date
# for all active-repos except perennial. Please note that all repos will be in
# detached HEAD state after running this. Specific repos can be kept at master with
# comma separated option -master. Will error out if there are any working copy changes
# in repos to checkout. Dates can be of formats supported by git, including RFC 2822,
# ISO 8601, and also the following:
# `YYYY.MM.DD`, `MM/DD/YYYY` and `DD.MM.YYYY`
# 
# see https://github.com/git/git/blob/master/Documentation/date-formats.txt
# 
# Usage:
# checkout-date.sh -m hookes-law,tambo 2018.01.12
# 
# Author: Jesse Greenberg
# 
#=======================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

# parse command line options
while getopts ":m:" opt; do
  case $opt in
    m)

      # parse comma separated list
      for i in $(echo $OPTARG | sed "s/,/ /g")
      do
        masterList+=("$i")
      done
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done
shift $(($OPTIND-1))

# date required
if [ -z "$1" ]; then
  echo "Usage: `basename $0` -m comma,separated,repo,list date"
  exit 1
fi

# get the difference between active-repos and masterList, these are the repos to checkout
declare -a reposToCheckout
for repo in `cat perennial/data/active-repos | xargs | tr -d '\r'`
do
  inBoth="false"
  for exclude in "${masterList[@]}"; do
    if [ "$repo" == "$exclude" ]; then
      inBoth="true"
    fi
  done
  if [ $inBoth == "false"  ]; then

    # list separated by a space
    reposToCheckout+="$repo "
  fi
done

# before checking out, exit if there are any working copy changes
for rep in $reposToCheckout; do
  if [ -d "$rep" ]; then
    cd "$rep"

    # status (empty string if clean)
    STATUS=`git status --porcelain`

    if [ -n "$STATUS" ]; then
      echo "Working copy changes in $rep, commit or stash changes"
      exit 1
    fi

    cd ..
  fi
done
echo $rep

# checkout the last commit before date in reposToCheckout
for rep in ${reposToCheckout[@]}; do
  if [ -d "$rep" ]; then
    cd "$rep"
    git checkout `git rev-list -n 1 --before="$1" master`
    cd ..
  fi
done