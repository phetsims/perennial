#!/usr/bin/env bash

# Usage:
#   ./bin/import-directly.sh my-simulation

SIMULATION_NAME="$1"

if [ -z "$SIMULATION_NAME" ]; then
  echo "Error: No simulation name provided."
  echo "Usage: ./bin/import-directly.sh <simulation-name>"
  exit 1
fi

deno run --allow-all js/scripts/import-directly.ts "$SIMULATION_NAME" --phase1
deno run --allow-all js/scripts/import-directly.ts "$SIMULATION_NAME" --phase2
deno run --allow-all js/scripts/import-directly.ts "$SIMULATION_NAME" --phase3