#!/bin/bash
#=============================================================================================
# To be used by commit-report.sh only
# Author: Sam Reid (PhET Interactive Simulations)
#=============================================================================================

git log --all --remotes --since=7.days --author=$1 --pretty=format:"%an %ad %s" --date=relative
printf "\n"
printf "\n"