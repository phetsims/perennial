#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install root NPM dependencies
npm install

cd ..

# Function to clone repositories only if they don't exist
clone_if_missing() {
    local repo_name=$1
    local target_dir=${2:-$repo_name}  # Default to repo_name if target_dir is not provided
    local repo_url="https://github.com/phetsims/${repo_name}.git"

    if [ -d "$target_dir" ]; then
        echo "Repository '$target_dir' already exists. Skipping clone."
    else
        echo "Cloning '$repo_url' into '$target_dir'..."
        # TODO: Change branch to phetsims-v1
        git clone "$repo_url" -b main --single-branch "$target_dir"
    fi
}

# Clone missing repositories
clone_if_missing "least-squares-regression"
clone_if_missing "chipper"
clone_if_missing "phet-core"
clone_if_missing "perennial" "perennial-alias"
clone_if_missing "brand"
clone_if_missing "phetmarks"
clone_if_missing "sherpa"
clone_if_missing "query-string-machine"
clone_if_missing "blackbody-spectrum"
clone_if_missing "joist"
clone_if_missing "tambo"
clone_if_missing "sun"
clone_if_missing "dot"
clone_if_missing "tandem"
clone_if_missing "twixt"
clone_if_missing "scenery-phet"
clone_if_missing "phetcommon"
clone_if_missing "scenery"
clone_if_missing "utterance-queue"
clone_if_missing "kite"
clone_if_missing "assert"
clone_if_missing "babel"
clone_if_missing "axon"

# Install NPM dependencies in 'perennial-alias'
cd ./perennial-alias
npm install

# Install NPM dependencies in 'chipper'
cd ../chipper
npm install

# Start transpiler and HTTP server concurrently
# Using & to run them in the background
../perennial-alias/bin/sage run js/grunt/tasks/transpile.ts --live &  # Start transpiler

# TODO: change to perennial
cd ../perennial-alias
npx http-server ../ -p 80 -c --silent &    # Start HTTP server

echo "######################################################"
echo "# Ready! Open http://localhost/phetmarks in your browser. Transpiler will output below."
echo "######################################################"

# Wait for both background processes to keep the script running
wait