#!/usr/bin/env zsh
set -euo pipefail

# Watch for changed strings, and run grunt modulify --targets=strings
# when they change, playing a sound on success or failure.
# This is developed solely for MacOS on zsh.
# If a new repo is added, the script must be restarted.
# Run it from any repo
#
# @author Sam Reid (PhET Interactive Simulations)

# ===== audio config =====
SUCCESS_SOUND=${SUCCESS_SOUND:-/System/Library/Sounds/Glass.aiff}
FAIL_SOUND=${FAIL_SOUND:-/System/Library/Sounds/Basso.aiff}
export SUCCESS_SOUND FAIL_SOUND
# ============================================

ROOT="../"
echo "[watch-strings] root: $ROOT"

typeset -a PIDS
PIDS=()

watch_one() {
  local dir="$1"
  local target="$2"
  echo "[watch-strings] watching: $target"
  (
    print -r -- "$target" | entr -n zsh -c '
      cd "$1" || exit 1
      if grunt modulify --targets=strings; then
        (afplay "$SUCCESS_SOUND" >/dev/null 2>&1 &)
      else
        (afplay "$FAIL_SOUND" >/dev/null 2>&1 &)
        exit 1
      fi
    ' _ "$dir"
  ) &
  PIDS+=($!)
}

# Start watchers for existing first-level dirs that match <dir>/<dir>-strings_en.yaml
for d in "$ROOT"/*(/N); do
  name="${d:t}"
  target="${d}/${name}-strings_en.yaml"
  [[ -f "$target" ]] && watch_one "$d" "$target"
done

# If nothing matched, exit cleanly.
if (( ${#PIDS} == 0 )); then
  echo "[watch-strings] no targets found under: $ROOT"
  exit 0
fi

trap 'echo; echo "[watch-strings] stopping..."; kill -TERM $PIDS 2>/dev/null || true; wait' INT TERM
wait