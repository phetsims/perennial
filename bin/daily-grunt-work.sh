#!/bin/bash
#=======================================================================================
#
# This script is run daily on bayes, doing automatic grunt work to keep the project up
# to date. Edit this script and commit to automatically add to the daily cron job.
#
#
# The cron job on bayes:
# 1 3 * * * cd /data/share/phet/automated-grunt-work/perennial; git pull; ./bin/daily-grunt-work.sh >& ~/daily-grunt-work.log;
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
date

cd perennial || exit
git pull
npm prune && npm update
grunt checkout-master-all
cd ..

perennial/bin/clone-missing-repos.sh
node perennial/js/scripts/pull-all.js
node perennial/js/scripts/push-all.js

perennial/bin/for-each.sh perennial/data/active-repos "npm prune && npm update; git stash"

cd chipper || exit
node js/scripts/transpile.js
cd ..

###########################################################################################################
# update-copyright-dates
echo "COPYRIGHT UPDATES:"
copyrightUpdateCommand="grunt update-copyright-dates && git commit -am 'update copyright dates from daily grunt work' --no-verify && git push"
perennial/bin/for-each.sh perennial/data/active-repos "${copyrightUpdateCommand}"

###########################################################################################################
# report third party
echo "THIRD PARTY REPORT:"
cd chipper || exit
grunt report-third-party
cd ../sherpa || exit
git pull
echo "report third party done, potentially committing"
git commit -am "Update third-party-licenses from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
# Update responsible dev/designer markdown output
echo "RESPONSIBLE DEV MARKDOWN:"
node ./phet-info/sim-info/generateMarkdownOutput.mjs
cd phet-info || exit
git commit -am "Update responsible_dev markdown output from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
# Update perennial/data/ lists, make sure to npm prune and update first see https://github.com/phetsims/perennial/issues/155
echo "GENERATE DATA LISTS:"
cd perennial || exit
grunt generate-data
cd ..

##########################################################################################################
# Update perennial/data/ lists, make sure to npm prune and update first see https://github.com/phetsims/perennial/issues/155
echo "REOPEN ISSUES LINKED IN TODOS:"
cd perennial || exit
grunt reopen-issues-from-todos
cd ..

##########################################################################################################

echo "GENERATE DEVELOPMENT STRINGS:"
perennial/bin/for-each.sh perennial/data/active-repos grunt generate-development-strings
cd babel || exit
git add ./_generated_development_strings # cover newly created files
git commit -am "Update development strings from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################

echo "BUILD SKIFFLE:"
cd skiffle || exit
grunt
git commit -am "Update skiffle build from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################

echo "PUBLISH LATEST PHET_IO LINKS:"
cd perennial || exit
node js/scripts/publish-phet-io-latest-links.js /data/web/htdocs/dev/phet-io/latest
cd ..

##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
##########################################################################################################
###########################################################################################################
# regenerate documentation
# Binder is less important, and it also has been known to have a hard failure (rarely). So put it towards the end.
echo "BINDER DOC:"
cd binder || exit
npm prune && npm update
npm run build
git add .
git commit -am "Update binder doc from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
##########################################################################################################
##########################################################################################################
# No grunt work below this point.
# Final clean up steps, just to be sure
echo "PUSH ALL CLEANUP:"
node perennial/js/scripts/pull-all.js
node perennial/js/scripts/push-all.js
date
echo "DAILY GRUNT WORK COMPLETE"