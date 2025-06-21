#!/bin/bash
set -e
cd "$(dirname "$0")"

# Add allowed folders (respects .gitignore)
git add public_html passthrough

# Check for staged changes
if ! git diff --cached --quiet; then
  # Prompt for a custom commit message
  echo "Enter a short description of the changes:"
  read -r USER_MSG

  # Fallback if message is blank
  if [[ -z "$USER_MSG" ]]; then
    USER_MSG="No description provided"
  fi

  # Commit and push with timestamp
  git commit -m "$USER_MSG — pushed on $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin main
else
  echo "No changes to commit."
fi
