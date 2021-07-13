#!/bin/bash
#=======================================================================================
#
# This script is run daily on bayes, doing automatic grunt work to keep the project up
# to date. Edit this script and commit to automatically add to the daily cron job.
#
#
# The cron job on bayes:
# 1 3 * * * cd /data/share/phet/automated-grunt-work/perennial; git pull; ./bin/daily-grunt-work.sh > ~/daily-grunt-work.log 2> ~/daily-grunt-work-error.log
#
# Author: Michael Kauzmann
#
#=======================================================================================

# Exit immediately on Ctrl-C
trap "exit 1" SIGINT

NOTIFICATION_EMAILS=michael.kauzmann@colorado.edu

{

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
  perennial/bin/pull-all.sh -p
  perennial/bin/for-each.sh perennial/data/active-repos "npm prune && npm update"

  ###########################################################################################################
  # update-copyright-dates
  echo "COPYRIGHT UPDATES:"
  copyrightUpdateCommand="grunt update-copyright-dates && git commit -am 'update copyright dates from daily grunt work' && git push"
  perennial/bin/for-each.sh perennial/data/active-repos "${copyrightUpdateCommand}"

  ###########################################################################################################
  # report third party
  echo "THIRD PARTY REPORT:"
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
  echo "BINDER DOC:"
  cd binder || exit
  npm prune && npm update
  npm run build
  git commit -am "Update binder doc from daily grunt work"
  git push
  cd ..

  ##########################################################################################################
  # copy files from perennial to chipper to keep them in sync, see https://github.com/phetsims/perennial/issues/111
  # and https://github.com/phetsims/chipper/issues/1018
  echo "COPY PERENNIAL FILES TO CHIPPER:"
  cp -R perennial/js/dual/. chipper/js/dual
  cd chipper || exit
  grunt update-copyright-dates # update SimVersion.js, this will only hit SimVersion.js since everything was updated above.
  git commit -am "Copy perennial/dual to chipper/dual from daily grunt work"
  git push
  cd ..

  ##########################################################################################################
  # Update responsible dev/designer markdown output
  echo "RESPONSIBLE DEV MARKDOWN:"
  node ./phet-info/sim-info/generateMarkdownOutput.mjs
  cd phet-info || exit
  git commit -am "Update responsible_dev markdown output from daily grunt work"
  git push
  cd ..

  ##########################################################################################################
  # Update perennial/data/ lists, make sure to npm prune and update first see https://github.com/phetsims/perennial/issues/155
  echo "GENERATE DATA LISTS:"
  cd perennial || exit
  grunt generate-data
  cd ..

  ##########################################################################################################
  ##########################################################################################################
  ##########################################################################################################
  # Final clean up steps, just to be sure
  echo "PUSH ALL CLEANUP:"
  ./perennial/bin/push-all.sh
  ##########################################################################################################

  ##########################################################################################################
  # No grunt work below this point.
  # Capture errors and email for them.
} 2> >(date | mailx -s "[Daily Grunt Work] Error during process" ${NOTIFICATION_EMAILS})
