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
# 1 3 * * * cd /data/share/phet/automated-grunt-work/totality; git pull; ./perennial-alias/bin/daily-grunt-work.sh > ~/daily-grunt-work-out.log 2> ~/daily-grunt-work-error.log;
#
# Author: Michael Kauzmann
#
#=======================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

# cd to the directory where your git repositories live (monorepo root)
binDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
workingDir=${binDir}/../..
cd ${workingDir} || exit

# External polyrepos that are not part of the monorepo
EXTERNAL_DIR="${workingDir}/../automated-grunt-work"

# Clone a repo if it doesn't already exist
function clone_if_missing(){
  local dir=$1
  local repo_url=$2
  if [ ! -d "$dir" ]; then
    mkdir -p "$(dirname "$dir")"
    git clone "$repo_url" "$dir"
  fi
}

# Log to both out and err, so that it shows up in the error logs
function logWithStderr(){
  echo $1 | tee >(cat >&2)
}

logWithStderr "Daily Grunt Work on `date`"
logWithStderr "node@`node --version`, npm@`npm --version`"

npm install

###########################################################################################################
# update-copyright-dates
logWithStderr "TASK - COPYRIGHT UPDATES:"
node _totality/scripts/update-copyright-dates.mjs
git add -A
git commit -m "Update copyright dates from daily grunt work" --no-verify && git push || true

###########################################################################################################
# report third party
logWithStderr "TASK - THIRD PARTY REPORT:"
(cd chipper && npx grunt report-third-party)
git add sherpa/third-party-licenses.md
git commit -m "Update third-party-licenses from daily grunt work" --no-verify && git push || true

##########################################################################################################
# Update responsible dev/designer markdown output
logWithStderr "TASK - RESPONSIBLE DEV MARKDOWN:"
(cd phet-info && npm ci)
perennial-alias/bin/sage run ./phet-info/sim-info/generateMarkdownOutput.mjs
git add phet-info/
git commit -m "Update responsible_dev markdown output from daily grunt work" --no-verify && git push || true

##########################################################################################################
# Update perennial-alias/data/ lists
logWithStderr "TASK - GENERATE DATA LISTS:"
(cd perennial-alias && npx grunt generate-data)
git add perennial-alias/data/
git commit -m "Update data lists from daily grunt work" --no-verify && git push || true

##########################################################################################################
# Reopen any github issues that still have TODOs in the codebase linking to them
logWithStderr "TASK - REOPEN ISSUES LINKED IN TODOS:"
(cd perennial-alias && bin/sage run js/scripts/reopen-issues-from-todos.ts)
(cd perennial-alias && bin/sage run js/scripts/reopen-issues-from-todos.ts --repoList=active-website-repos)

##########################################################################################################

logWithStderr "TASK - GRUNT UPDATE:"
for repo in $(git ls-tree --name-only -d HEAD | grep -v -e '^\.' -e '^node_modules$' -e '^_totality$'); do
  (cd chipper && npx grunt update --repo=$repo) || true
done
git add -A
git commit -m "grunt update from daily grunt work" --no-verify && git push || true

##########################################################################################################

logWithStderr "TASK - BUILD SKIFFLE:"
clone_if_missing "${EXTERNAL_DIR}/skiffle" "https://github.com/phetsims/skiffle.git"
cd ${EXTERNAL_DIR}/skiffle && git pull && npm prune && npm update && npx grunt && git add . && git commit -am "Update skiffle build from daily grunt work" --no-verify && git push
cd ${workingDir}

##########################################################################################################

# TODO: publish-phet-io-latest-links requires per-repo git branches (e.g. 1.3) which don't exist in totality.
# This task must be run from the polyrepo layout. See https://github.com/phetsims/totality/issues/35
# logWithStderr "TASK - PUBLISH LATEST PHET_IO LINKS:"
# perennial-alias/bin/sage run perennial-alias/js/scripts/publish-phet-io-latest-links.js /data/web/htdocs/dev/phet-io/latest

##########################################################################################################

logWithStderr "TASK - UPDATE LOCALE INFO FILES"
(cd chipper/js/data && ../../../perennial-alias/bin/sage run updateLocaleInfo.ts)
git add chipper/js/data/
git commit -m "Update locale info from daily grunt work" --no-verify && git push || true

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
clone_if_missing "${EXTERNAL_DIR}/binder" "https://github.com/phetsims/binder.git"
cd ${EXTERNAL_DIR}/binder && git pull && npm prune && npm update && npm run build && git add . && git commit -am "Update binder doc from daily grunt work" --no-verify && git push
cd ${workingDir}

##########################################################################################################
##########################################################################################################
##########################################################################################################
# No grunt work below this point.
# Final clean up steps, just to be sure
date
logWithStderr "TASK - DAILY GRUNT WORK COMPLETE"
