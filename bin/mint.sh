#!/bin/bash

###
# Bash script to run node/tsx tasks. This is an alternative layer to using grunt. It works by searching for tasks within
# the `js/grunt/tasks` directory of the current project or the `chipper` project.
#
# @author Sam Reid (PhET Interactive Simulations)
#

# Ensure the script runs with tsx on macOS/Linux or tsx.cmd on Windows

# Determine the operating system
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  TSX_EXEC="../chipper/node_modules/.bin/tsx.cmd"
else
  TSX_EXEC="../chipper/node_modules/.bin/tsx"
fi

# Define an array of base directories to search for task scripts
BASE_DIRS=(
  "./js/grunt/tasks"
  "../chipper/js/grunt/tasks"
)

# Function to display error messages and exit
error_exit() {
  echo "$1" >&2
  exit 1
}

# Check if the first argument is missing or starts with a hyphen (indicating options)
if [[ -z "$1" || "$1" =~ ^- ]]; then
  TASK="default"
else
  TASK="$1"
  shift
fi

# Initialize variables to store the found script file and its path
FOUND_SCRIPT=""
FOUND_PATH=""

# Iterate over each base directory to find the task script
for BASE_DIR in "${BASE_DIRS[@]}"; do
TS_SCRIPT_FILE="$BASE_DIR/${TASK}.ts"
JS_SCRIPT_FILE="$BASE_DIR/${TASK}.js"

if [[ -f "$TS_SCRIPT_FILE" ]]; then
    FOUND_SCRIPT="$TS_SCRIPT_FILE"
    FOUND_PATH="$BASE_DIR"
    break
elif [[ -f "$JS_SCRIPT_FILE" ]]; then
    FOUND_SCRIPT="$JS_SCRIPT_FILE"
    FOUND_PATH="$BASE_DIR"
    break
  fi
done

# Execute the found script or display an error if not found
if [[ -n "$FOUND_SCRIPT" ]]; then
  # echo "Executing task '$TASK' from '$FOUND_PATH'"
  "$TSX_EXEC" "$FOUND_SCRIPT" "$@"
else
  error_exit "Unknown command or script file not found: $TASK"
fi