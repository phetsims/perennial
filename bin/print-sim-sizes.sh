#!/bin/bash
#=======================================================================================
#
# Use this to get sim build sizes over time. Gets all commits in dependencies between
# two dates. For each commit, we revert working copy to date of that commit and build
# sim, printing size. By default will get sizes from 1 year ago to current date. Sizes
# are printed in bytes. Output is readable format, but can also print in formats for
# easy plotting. Reverts working copy to master when done.
# 
# Options:
# -s: start date for all commits, of the formats supported by git
# -u: end date for all commits, of the formats supported by git
# -f: format for output, either 'default' or 'mathematica' for now
#   default: {'%Y-%m-%d %H:%M:%S', size in bytes}
#   mathematica: '{DateObject[{%Y, %m, %d, %H, %M, %S}], size_in_bytes}'
# 
# Usage: perennial/bin/print-sim-sizes.sh -s "Feb 13 2023" -u "Feb 14 2023" resistance-in-a-wire
# 
# Author: Jesse Greenberg
# 
#=======================================================================================
# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

SINCE=`date --date="1 year ago" '+%b %d %Y'`
UNTIL=`date '+%b %d %Y'`
FORMAT="default"

# parse command line options
while getopts ":s:u:f:" opt; do
  case $opt in
    s)
      SINCE=$OPTARG
      ;;
    u)
      UNTIL=$OPTARG
      ;;
    f)
      FORMAT=$OPTARG
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done
shift $(($OPTIND-1))

if [ -z "$1" ]; then
  echo "Usage: print-sim-sizes.sh -s since_date -u until_date -f format resistance-in-a-wire"
  exit 1
fi
sim="$1"

# TODO: Can we get these from somewhere? How to get JSON entries in bash?
declare -a dependencies=( assert axon brand chipper dot joist kite phet-core phetcommon query-string-machine scenery-phet scenery sherpa sun tandem )
dependencies+=("$sim")

for dep in "${dependencies[@]}"; do
  if [ -d $dep ]; then

    # get all commits in this dep between SINCE and UNTIL dates
    cd $dep
    commitShas=`git log --since "$SINCE" --until "$UNTIL" --format='%H'`
    cd ..

    for sha in $commitShas; do

      # checkout this sha immediately to easily get its date with git log
      cd $dep
      echo $dep "$sha"
      git checkout "$sha" >/dev/null 2>&1
      shaDate=`git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S'`

      # format date depending on option
      printDate=$shaDate
      if [ FORMAT="mathematica" ]; then
        printDate=`git log -1 --format=%cd --date=format:'DateObject[{%Y, %m, %d, %H, %M, %S}]'`
      fi
      cd ..

      # revert working copy to date of sha
      cd perennial
      grunt checkout-timestamp --repo="$sim" --timestamp="$shaDate"
      cd ..

      # build the sim
      cd "$sim" 
      grunt

      # get the size
      if [ -d build ]; then
        cd build/phet/
        if [ -f "$sim"_en_phet.html ]; then
          echo {"$printDate", `du -b "$sim"_en_phet.html | cut -f1`}
        else
        echo {"$printDate", 0} "$sim"_en_phet.html
        fi
        cd ../..
      else
        echo {"$printDate", 0} "$sim"_en_phet.html
      fi

      cd ..
      echo
    done
  fi
done

# we are done, back to master
perennial/bin/for-each.sh active-repos git checkout master