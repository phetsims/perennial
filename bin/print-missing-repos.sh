#!/bin/bash
#=======================================================================================
#
# Prints a list of repos that are missing from your working copy.
# Requires perennial repo to be checked out at the top-level of your working copy,
# and all other repos to be siblings of perennial.
#
# Author: Chris Malley (PixelZoom, Inc.)
# Author: Jonathan Olson <jonathan.olson@colorado.edu>
#
#=======================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

# Lists of repo names and files at the top-level of the working copy
activeRepos=`cat ./perennial/data/active-repos | tr -d '\015'`
workingFiles=`ls -1 .`

# List of file names that are either in active-repos OR in the directory listing (but not both).
# uniq -u only includes non-duplicate lines
missingFiles=`echo -e "${activeRepos}\n${workingFiles}" | sort | uniq -u`

# List of missing repos. That is, file names that are in active-repos, but not in the directory listing.
# uniq -d only includes duplicate lines
echo -e "${activeRepos}\n${missingFiles}" | sort | uniq -d
