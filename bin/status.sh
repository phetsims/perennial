#!/bin/bash
#====================================================================================================
#
# Shows git status for all repos
#
# GREEN: on master, no working copy changes
# RED: anything else
#
# Author: Jonathan Olson
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

# ANSI escape sequences to move to the right (in the same line) or to apply or reset colors
moveRight="\033[42G"
red="\033[31m"
green="\033[32m"
reset="\033[0m"

for dir in *
do
  # ignore non-directory files
  if [ -d "${dir}" ]; then
    cd "${dir}" > /dev/null
    # ignore directory if it's not a git repo base
    if [ -d ".git" ]; then
      echo -n "${dir}" # -n for no newline

      symbolicRef=`git symbolic-ref -q HEAD`

      # current branch name OR an empty string (if detached head)
      branch=`echo "${symbolicRef}" | sed -e 's/refs\/heads\///'`

      # current SHA
      sha=`git rev-parse HEAD`

      # status (empty string if clean)
      gitStatus=`git status --porcelain`

      # if no branch, print our SHA (detached head)
      if [ -z "${branch}" ]; then
        echo -e -n "${moveRight}${red}${sha}${reset}"
      else
        # Safe method to get ahead/behind counts, see http://stackoverflow.com/questions/2969214/git-programmatically-know-by-how-much-the-branch-is-ahead-behind-a-remote-branc
        # get the tracking-branch name
        trackingBranch=`git for-each-ref --format='%(upstream:short)' ${symbolicRef}`

        # creates global variables $1 and $2 based on left vs. right tracking
        # inspired by @adam_spiers
        counts=`git rev-list --left-right --count ${trackingBranch}...HEAD` # e.g. behind-count + '\t' + ahead-count

        # split the behind and ahead count
        behind=`echo "${counts}" | awk '{ print $1 }'`
        ahead=`echo "${counts}" | awk '{ print $2 }'`

        # color branch name based on branch and status. green for clean master, red for anything else
        if [ "${branch}" = "master" ]; then
          if [ -z "$gitStatus" -a "${ahead}" -eq 0 ]; then
            echo -e -n "${moveRight}${green}master${reset}"
          else
            echo -e -n "${moveRight}${red}master${reset}"
          fi
        else
          echo -e -n "${moveRight}${red}${branch}${reset}"
        fi

        if [ ! "${ahead}" -eq 0 ]; then
          echo -e -n " ahead ${ahead}"
        fi

        if [ ! "${behind}" -eq 0 ]; then
          echo -e -n " behind ${behind}"
        fi
      fi

      echo ""

      # print status, if any
      if [ ! -z "${gitStatus}" ]; then
        echo "${gitStatus}"
      fi
    fi
    cd .. > /dev/null
  fi
done
