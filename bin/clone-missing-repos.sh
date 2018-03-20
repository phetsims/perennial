#!/bin/bash
#=============================================================================================
#
# Clones all missing repos.
#
# Author: Aaron Davis
# Author: Chris Malley (PixelZoom, Inc.)
#
#=============================================================================================

binDir=`dirname "${BASH_SOURCE[0]}"`
cd ${binDir}/../..

for repo in `${binDir}/print-missing-repos.sh | xargs`
do
  git clone https://github.com/phetsims/"${repo}".git
done
