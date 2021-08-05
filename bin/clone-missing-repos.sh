#!/bin/bash
#=============================================================================================
#
# Clones all missing repos. Use -p to omit private repos.
#
# Author: Aaron Davis
# Author: Chris Malley (PixelZoom, Inc.)
#
#=============================================================================================

omitPrivateRepos="false"

# parse command line options
while getopts ":p" opt; do
  case ${opt} in
    p)
      omitPrivateRepos="true"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit
      ;;
  esac
done

# location of perennial/bin/
binDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# cd to the directory that contains your git repos
cd ${binDir}/../..

if [ ${omitPrivateRepos} == "true" ]; then

  # Identify missing repos, public only
  missingRepos=`comm -23 <(${binDir}/print-missing-repos.sh) perennial/data/active-repos-private | xargs`
else

  # Identify missing repos, public and private
  missingRepos=`${binDir}/print-missing-repos.sh | xargs`
fi

# Clone missing repos
for repo in ${missingRepos}
do
  echo ${repo}

  if [ ${repo} == "perennial-alias" ]; then
    git clone https://github.com/phetsims/perennial.git perennial-alias
  else
    git clone https://github.com/phetsims/"${repo}".git
  fi
  ( cd ${repo}; git init --template=../phet-info/git-template-dir )
done
