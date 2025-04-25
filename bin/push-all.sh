#!/bin/bash
#====================================================================================================
#
# Does an in-series 'git push' on all repos with unpushed commits, in parallel for speed
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../
cd ${workingDir}

bin/sage run js/scripts/push-all $@

