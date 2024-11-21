#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
# Launches the git hooks for pre-commit. This file exists so that its logic can be changed without the need
# to reinstall the hooks to every repo.
#
# Please see https://github.com/phetsims/phet-info/blob/main/doc/phet-development-overview.md#utilities-and-instrumentation-for-development-and-testing
# for installation instructions.
#
# @author Michael Kauzmann (PhET Interactive Simulations)
# @author Sam Reid (PhET Interactive Simulations)
#-----------------------------------------------------------------------------------------------------------------------

# Detect the current branch. Requires git 2.22.0 or higher
current_branch=$(git branch --show-current)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Only run pre-commit hooks in main, see https://github.com/phetsims/perennial/issues/276
if [[ "$current_branch" == "main" ]]; then
 "$SCRIPT_DIR/sage" run "$SCRIPT_DIR/../../chipper/js/grunt/tasks/pre-commit.ts"
fi