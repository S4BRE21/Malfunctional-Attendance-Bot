#!/bin/bash
set -e
cd "$(dirname "$0")"

# Add allowed folders and files (respects .gitignore)
git add public_html passthrough .gitignore push.sh

# Check for staged changes
if ! git diff --cached --quiet; then
  # Prompt for a custom commit message
  echo "Enter a short description of the changes:"
  read -r USER_MSG

  # Fallback if message is blank
  if [[ -z "$USER_MSG" ]]; then
    USER_MSG="No description provided"
  fi

  # Commit with timestamp
  git commit -m "$USER_MSG — pushed on $(date '+%Y-%m-%d %H:%M:%S')"

  # Push to GitHub
  git push origin main
  echo "✅ Push complete."
else
  echo "No changes to commit."
fi
