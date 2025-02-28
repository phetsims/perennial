#!/bin/bash
#====================================================================================================
#
# Shows git status for all repos
#
# GREEN: on main, no working copy changes
# RED: anything else
#
# Author: Jonathan Olson
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../
cd ${workingDir}

bin/sage run js/grunt/tasks/sync --npmUpdate=false --pull=false --logAll $@
