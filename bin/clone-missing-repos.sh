#!/bin/bash
#=============================================================================================
#
# Clones all missing repos. Use -p to omit private repos.
#
# Author: Aaron Davis
# Author: Chris Malley (PixelZoom, Inc.)
#
#=============================================================================================


# location of perennial/bin/
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# requires cwd to be the top level of a repo
cd "${binDir}/../"

./bin/sage run ./js/grunt/tasks/clone-missing-repos.ts "$@"