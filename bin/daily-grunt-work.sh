#!/bin/bash
#=======================================================================================
#
# This script is run daily on bayes, doing automatic grunt work to keep the project up
# to date. Edit this script and commit to automatically add to the daily cron job.
#
# Author: Michael Kauzmann
# 
#=======================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

# cd to the directory where your git repositories live
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

echo "running daily grunt work. . ."

cd perennial
git pull
npm prune && npm update
grunt checkout-master-all
cd ..

perennial/bin/clone-missing-repos.sh
perennial/bin/pull-all.sh -p

# update-copyright-dates
cd chipper && npm prune && npm update && cd ..
updateCommand="npm update && grunt update-copyright-dates && git commit -am 'update copyright dates'"
perennial/bin/for-each.sh perennial/data/active-runnables "${updateCommand}"

# supplementary repos to update copyrights on
for repo in "scenery" "tandem" "axon" "dot" "kite" "phet-core" "phetcommon" "chipper";
  do
    cd $repo
    $updateCommand
    cd ..
  done

# report third party
cd chipper
grunt report-third-party

cd ../sherpa
git pull
echo "report third party done, potentially committing"

# this will exit with a non-zero code if there are working copy changes
git diff-index --quiet HEAD --
exitCode=$(echo $?)
echo $exitCode
if [ $exitCode != 0 ]; then
  echo "committing third party report"
  git add .
  git commit -m "Updating third-party-licenses from daily grunt work"
  git push
fi
