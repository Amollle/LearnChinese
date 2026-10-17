#!/bin/bash
# Double-click this file to start the LearnChinese app server.
# Then scan the QR code with your iPhone's Camera app.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
LOG="start-log.txt"
{
  echo "=== LearnChinese start: $(date) ==="
  echo "node: $(command -v node) $(node -v 2>/dev/null)"
} > "$LOG" 2>&1
echo "Starting LearnChinese..."
if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js is not installed. Install it from https://nodejs.org and double-click this file again." | tee -a "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi
# Stop any old copy of the app server that is still running
OLD=$(lsof -ti tcp:8081 2>/dev/null)
if [ -n "$OLD" ]; then
  echo "Stopping the old app server..." | tee -a "$LOG"
  kill $OLD 2>/dev/null; sleep 1; kill -9 $OLD 2>/dev/null
fi
echo "Getting photos ready (first time takes ~20 seconds)..."
node scripts/download-photos.mjs 2>&1 | tee -a "$LOG"
echo "Starting app server (fresh)..." | tee -a "$LOG"
echo
npx expo start --clear
