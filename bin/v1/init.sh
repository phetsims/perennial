#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install root NPM dependencies
npm install

# Clone missing repositories
./bin/clone-missing-repos.sh

# Checkout the desired branch TODO: Change to phetsims-v1
./bin/checkout-branch.sh main

# Install NPM dependencies in 'perennial-alias'
cd ../perennial-alias
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