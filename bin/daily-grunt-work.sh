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
binDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
workingDir=${binDir}/../..
cd ${workingDir} || exit

echo "running daily grunt work. . ."

cd perennial || exit
git pull
npm prune && npm update
grunt checkout-master-all
cd ..

perennial/bin/clone-missing-repos.sh
perennial/bin/pull-all.sh -p
perennial/bin/for-each.sh perennial/data/active-repos "npm prune && npm update"

###########################################################################################################
# update-copyright-dates
copyrightUpdateCommand="grunt update-copyright-dates && git commit -am 'update copyright dates from daily grunt work' && git push"
perennial/bin/for-each.sh perennial/data/active-repos "${copyrightUpdateCommand}"

###########################################################################################################
# report third party
cd chipper || exit
grunt report-third-party
cd ../sherpa || exit
git pull
echo "report third party done, potentially committing"
git commit -am "Update third-party-licenses from daily grunt work"
git push
cd ..

###########################################################################################################
# regenerate documentation
cd binder || exit
npm prune && npm update
npm run build
git commit -am "Update binder doc from daily grunt work"
git push
cd ..

##########################################################################################################
# copy PERENNIAL/SimVersion to chipper to keep them in sync, see https://github.com/phetsims/perennial/issues/111

cp perennial/js/common/SimVersion.js chipper/js/
cd chipper || exit
grunt update-copyright-dates # update SimVersion.js, this will only hit SimVersion.js since everything was updated above.
git commit -am "Update chipper's SimVersion from daily grunt work"
git push
cd ..

##########################################################################################################
# Update responsible dev/designer markdown output

node ./phet-info/sim-info/generateMarkdownOutput.mjs
cd phet-info || exit
git commit -am "Update responsible_dev markdown output from daily grunt work"
git push
cd ..

##########################################################################################################
# Update perennial/data/ lists, must npm prune and update first see https://github.com/phetsims/perennial/issues/155

cd perennial || exit
npm prune && npm update
grunt generate-data
cd ..

##########################################################################################################
