#!/bin/bash
#=============================================================================================
# Prints commits for the past 7 days by a specified author.
# Expects pwd to be a git repository.
#
# Author: Sam Reid (PhET Interactive Simulations)
#=============================================================================================

if [ -z "$1" ]
  then
    echo "Usage: `basename $0` author"
    exit 1
fi

git --no-pager log --all --remotes --since=7.days --author=$1 --pretty=format:"%an %ad %s" --date=relative
printf "\n\n"