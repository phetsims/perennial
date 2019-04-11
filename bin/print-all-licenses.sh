#!/bin/bash
#====================================================================================================
#
# For each file in active-repos, it prints the repo name and the 1st line of the LICENSE file
# in a GitHub markdown table format
#
# Author: Sam Reid
#
#====================================================================================================

binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
workingDir=${binDir}/../..
cd ${workingDir}

# ANSI escape sequences
red="\033[31m"
reset="\033[0m"

# Use GitHub markdown for table output
echo "Repo  | 1st line of LICENSE"
echo "------------- | -------------"

for repo in `cat perennial/data/active-repos | xargs`
do
  # Strip newline from end of repo
  repo=`echo ${repo}`

  if [ -d "${repo}" ]; then
    cd ${repo} &> /dev/null

    # If the license file exists, print its 1st line
    if [ -e "LICENSE" ]; then
        echo "${repo} | "`cat LICENSE | head -1`
    else
        echo -e "${red}${repo} | missing license${reset}"
    fi
    cd .. &> /dev/null
  else
    echo -e "${red}${repo} | missing repository${reset}"
  fi
done
