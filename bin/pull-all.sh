#!/bin/bash
#====================================================================================================
#
# Does a 'git pull --rebase' on every active repo.
#
# Author: Jonathan Olson
#
#====================================================================================================


binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../
cd ${workingDir}

bin/sage run js/grunt/tasks/sync --npmUpdate=false --status=false --checkoutMain=false $@
