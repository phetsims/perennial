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
# Usage:
#   ./perennial-alias/bin/daily-grunt-work.sh              # run all tasks (cron mode)
#   ./perennial-alias/bin/daily-grunt-work.sh copyright     # run just one task
#   ./perennial-alias/bin/daily-grunt-work.sh --list        # list available tasks
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

###########################################################################################################
# Task functions
###########################################################################################################

function task_copyright() {
  logWithStderr "TASK - COPYRIGHT UPDATES:"
  node _totality/scripts/update-copyright-dates.mjs
  git add -A
  git commit -m "Update copyright dates from daily grunt work" --no-verify && git push || true
}

function task_third-party() {
  logWithStderr "TASK - THIRD PARTY REPORT:"
  (cd chipper && npx grunt report-third-party)
  git add sherpa/third-party-licenses.md
  git commit -m "Update third-party-licenses from daily grunt work" --no-verify && git push || true
}

function task_responsible-dev() {
  logWithStderr "TASK - RESPONSIBLE DEV MARKDOWN:"
  (cd phet-info && npm ci)
  perennial-alias/bin/sage run ./phet-info/sim-info/generateMarkdownOutput.mjs
  git add phet-info/
  git commit -m "Update responsible_dev markdown output from daily grunt work" --no-verify && git push || true
}

function task_data-lists() {
  logWithStderr "TASK - GENERATE DATA LISTS:"
  (cd perennial-alias && npx grunt generate-data)
  git add perennial-alias/data/
  git commit -m "Update data lists from daily grunt work" --no-verify && git push || true
}

function task_reopen-todos() {
  logWithStderr "TASK - REOPEN ISSUES LINKED IN TODOS:"
  (cd perennial-alias && bin/sage run js/scripts/reopen-issues-from-todos.ts)
  (cd perennial-alias && bin/sage run js/scripts/reopen-issues-from-todos.ts --repoList=active-website-repos)
}

function task_update() {
  logWithStderr "TASK - GRUNT UPDATE:"
  for repo in $(git ls-tree --name-only -d HEAD | grep -v -e '^\.' -e '^node_modules$' -e '^_totality$'); do
    (cd chipper && npx grunt update --repo=$repo) || true
  done
  git add -A
  git commit -m "grunt update from daily grunt work" --no-verify && git push || true
}

function task_skiffle() {
  logWithStderr "TASK - BUILD SKIFFLE:"
  clone_if_missing "${EXTERNAL_DIR}/skiffle" "https://github.com/phetsims/skiffle.git"
  cd ${EXTERNAL_DIR}/skiffle && git pull && npm prune && npm update && npx grunt && git add . && git commit -am "Update skiffle build from daily grunt work" --no-verify && git push
  cd ${workingDir}
}

function task_phet-io-links() {
  # publish-phet-io-latest-links requires per-repo git branches (e.g. 1.3) which don't exist in totality.
  # Run from the polyrepo perennial-alias checkout. See https://github.com/phetsims/totality/issues/35
  logWithStderr "TASK - PUBLISH LATEST PHET_IO LINKS:"
  clone_if_missing "${EXTERNAL_DIR}/perennial-alias" "https://github.com/phetsims/perennial.git"
  (cd ${EXTERNAL_DIR}/perennial-alias && git pull && npm ci)
  ${EXTERNAL_DIR}/perennial-alias/bin/sage run ${EXTERNAL_DIR}/perennial-alias/js/scripts/publish-phet-io-latest-links.js /data/web/htdocs/dev/phet-io/latest
}

function task_locale-info() {
  logWithStderr "TASK - UPDATE LOCALE INFO FILES"
  (cd chipper/js/data && ../../../perennial-alias/bin/sage run updateLocaleInfo.ts)
  git add chipper/js/data/
  git commit -m "Update locale info from daily grunt work" --no-verify && git push || true
}

function task_binder() {
  # Binder is less important, and it also has been known to have a hard failure (rarely). So put it towards the end.
  logWithStderr "TASK - BINDER DOC:"
  clone_if_missing "${EXTERNAL_DIR}/binder" "https://github.com/phetsims/binder.git"
  cd ${EXTERNAL_DIR}/binder && git pull && npm prune && npm update && npm run build && git add . && git commit -am "Update binder doc from daily grunt work" --no-verify && git push
  cd ${workingDir}
}

# All task names in execution order
ALL_TASKS="copyright third-party responsible-dev data-lists reopen-todos update skiffle phet-io-links locale-info binder"

###########################################################################################################
# Dispatch
###########################################################################################################

SKIP_INSTALL=false
TASK_ARG=""

for arg in "$@"; do
  case $arg in
    --list)
      echo "Available tasks:"
      for task in $ALL_TASKS; do
        echo "  $task"
      done
      exit 0
      ;;
    --skip-install)
      SKIP_INSTALL=true
      ;;
    *)
      TASK_ARG="$arg"
      ;;
  esac
done

logWithStderr "Daily Grunt Work on `date`"
logWithStderr "node@`node --version`, npm@`npm --version`"

if [ "$SKIP_INSTALL" = false ]; then
  npm install
fi

if [ -n "$TASK_ARG" ]; then
  # Run a single task
  task_func="task_$TASK_ARG"
  if declare -f "$task_func" > /dev/null; then
    $task_func
  else
    echo "Unknown task: $TASK_ARG" >&2
    echo "Run with --list to see available tasks" >&2
    exit 1
  fi
else
  # Run all tasks (cron mode)
  for task in $ALL_TASKS; do
    task_$task
  done
fi

date
logWithStderr "TASK - DAILY GRUNT WORK COMPLETE"
