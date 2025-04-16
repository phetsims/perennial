#!/bin/bash
#=======================================================================================
#
# This script is run daily on bayes, doing automatic grunt work to keep the project up
# to date. Edit this script and commit to automatically add to the daily cron job.
#
# To debug the process, log onto bayes as phet-admin, and view the daily-grunt-work-error.log, which should hold any
# trouble, otherwise, you can parse through the whole `-out.log` file for details.
#
# The cron job on bayes:
# 1 3 * * * cd /data/share/phet/automated-grunt-work/perennial; git pull; ./bin/daily-grunt-work.sh > ~/daily-grunt-work-out.log 2> ~/daily-grunt-work-error.log;
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

# Log to both out and err, so that it shows up in the error logs
function logWithStderr(){
  echo $1 | tee >(cat >&2)
}

logWithStderr "Daily Grunt Work on `date`"
logWithStderr "node@`node --version`, npm@`npm --version`"

cd perennial || exit
git pull
cd ..

perennial/bin/for-each.sh perennial/data/active-repos "git stash"

cd perennial || exit
npm prune && npm update
grunt checkout-main-all
cd ..

perennial/bin/sage run perennial/js/grunt/tasks/sync --npmUpdate=false
perennial/bin/sage run perennial/js/scripts/push-all

perennial/bin/for-each.sh perennial/data/active-repos "npm prune && npm update"

cd chipper || exit
grunt transpile --all
cd ..

###########################################################################################################
# update-copyright-dates
logWithStderr "TASK - COPYRIGHT UPDATES:"
copyrightUpdateCommand="grunt update-copyright-dates && git commit -am 'update copyright dates from daily grunt work' --no-verify && git push"
perennial/bin/for-each.sh perennial/data/active-repos "${copyrightUpdateCommand}"

###########################################################################################################
# report third party
logWithStderr "TASK - THIRD PARTY REPORT:"
cd chipper || exit
grunt report-third-party
cd ../sherpa || exit
git pull
logWithStderr "TASK - report third party done, potentially committing"
git commit -am "Update third-party-licenses from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
# Update responsible dev/designer markdown output
logWithStderr "TASK - RESPONSIBLE DEV MARKDOWN:"
perennial/bin/sage run ./phet-info/sim-info/generateMarkdownOutput.mjs
cd phet-info || exit
git commit -am "Update responsible_dev markdown output from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
# Update perennial/data/ lists, make sure to npm prune and update first see https://github.com/phetsims/perennial/issues/155
logWithStderr "TASK - GENERATE DATA LISTS:"
cd perennial || exit
grunt generate-data
git commit -am "Update data lists from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################
# Reopen any github issues that still have TODOs in the codebase linking to them
logWithStderr "TASK - REOPEN ISSUES LINKED IN TODOS:"
cd perennial || exit
bin/sage run js/scripts/reopen-issues-from-todos.ts
cd ..

##########################################################################################################

logWithStderr "TASK - GRUNT UPDATE:"
gruntUpdateCommand="grunt update && git commit -am 'grunt update  from daily grunt work' --no-verify && git push"
perennial/bin/for-each.sh perennial/data/active-repos "${gruntUpdateCommand}"
cd babel || exit
git add ./_generated_development_strings # cover newly created files
git commit -am "Update development strings from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################

logWithStderr "TASK - BUILD SKIFFLE:"
cd skiffle || exit
grunt
git commit -am "Update skiffle build from daily grunt work" --no-verify
git push
cd ..

##########################################################################################################

logWithStderr "TASK - PUBLISH LATEST PHET_IO LINKS:"
cd perennial || exit
bin/sage run js/scripts/publish-phet-io-latest-links.js /data/web/htdocs/dev/phet-io/latest
cd ..

##########################################################################################################

logWithStderr "TASK - UPDATE LOCALE INFO FILES"
cd chipper/js/data || exit
../../../perennial/bin/sage run updateLocaleInfo.js
git commit -am "Update locale info module.exports from daily grunt work" --no-verify
git push
cd ../../..

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
logWithStderr "TASK - BINDER DOC:"
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
logWithStderr "TASK - PUSH ALL CLEANUP:"
./perennial/bin/pull-all.sh
perennial/bin/sage run perennial/js/scripts/push-all.js
date
logWithStderr "TASK - DAILY GRUNT WORK COMPLETE"