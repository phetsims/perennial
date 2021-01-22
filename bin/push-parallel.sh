#!/bin/bash
#====================================================================================================
#
# Uses the gnu "parallel" script to push all active repos with unpushed commits in any branch.
# NOTE: This only works if you have "parallel" installed, see https://www.gnu.org/software/parallel/
# I tuned the number of jobs to minimize total time on my current development machine (Jan 22, 2020)
#
# Author: Sam Reid (PhET Interactive Simulations)
#
#====================================================================================================
parallel --jobs 8 -a perennial/data/active-repos 'cd {} && ../perennial/bin/push-conditional.sh'