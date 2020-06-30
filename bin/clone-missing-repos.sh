#!/bin/bash
#=============================================================================================
#
# Clones all missing repos.
#
# Author: Aaron Davis
# Author: Chris Malley (PixelZoom, Inc.)
#
#=============================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${binDir}/../..

for repo in `${binDir}/print-missing-repos.sh | xargs`
do
  git clone https://github.com/phetsims/"${repo}".git
  ( cd ${repo}; git init --template=../phet-info/git-template-dir )
done
