#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install root NPM dependencies
echo "Installing root NPM dependencies..."
npm install

# Navigate to the parent directory
cd ..

# Function to clone repositories only if they don't exist
clone_if_missing() {
    local repo_name=$1
    local target_dir=${2:-$repo_name}  # Default to repo_name if target_dir is not provided
    local repo_url="https://github.com/phetsims/${repo_name}.git"
    local branch="main" # TODO: Change to phetsims-v1

    if [ -d "$target_dir" ]; then
        echo "Repository '$target_dir' already exists. Skipping clone."
    else
        echo "Cloning '$repo_url' into '$target_dir' (branch: $branch)..."
        git clone "$repo_url" -b "$branch" "$target_dir"
    fi
}

# Array of repositories to clone
repos=(
    "perennial:perennial-alias"
    "assert"
    "axon"
    "babel"
    "blackbody-spectrum"
    "brand"
    "chipper"
    "dot"
    "joist"
    "kite"
    "least-squares-regression"
    "phet-core"
    "phetcommon"
    "phetmarks"
    "query-string-machine"
    "scenery"
    "scenery-phet"
    "sherpa"
    "sun"
    "tambo"
    "tandem"
    "twixt"
    "utterance-queue"
)

# Iterate over repositories and clone them one by one
for repo in "${repos[@]}"; do
    # Split repo and target_dir if a colon is present
    IFS=':' read -r repo_name target_dir <<< "$repo"
    clone_if_missing "$repo_name" "$target_dir"
done

echo "All cloning operations completed."

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