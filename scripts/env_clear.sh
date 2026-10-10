#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

ENV_FILES=(
  ".env"
  ".env.local",
  ".env.development",
  ".env.production"
)

EXCLUDE_DIRS=(
  "node_modules"
  ".git"
  ".next"
  "dist"
  "build"
  ".turbo"
  "coverage"
)

GREP_EXCLUDES=()

for dir in "${EXCLUDE_DIRS[@]}"; do
  GREP_EXCLUDES+=(--exclude-dir="$dir")
done

for ENV_FILE in "${ENV_FILES[@]}"; do

  [[ -f "$ENV_FILE" ]] || continue

  echo "Checking $ENV_FILE..."

  while IFS= read -r line || [[ -n "$line" ]]; do

    # Skip empty lines / comments
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    # Only KEY=value
    if [[ ! "$line" =~ ^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*[[:space:]]*= ]]; then
      continue
    fi

    KEY=$(echo "$line" | sed -E \
      's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*).*/\2/')

    # Search usage in project
    if grep -R \
      "${GREP_EXCLUDES[@]}" \
      --exclude=".env" \
      --exclude=".env.local" \
      --exclude="*.env" \
      --exclude="*.env.*" \
      -E \
      "(process\.env\.${KEY}\b|import\.meta\.env\.${KEY}\b|['\"]${KEY}['\"])" \
      . >/dev/null 2>&1; then

      echo "  ✓ $KEY"

    else

      echo "  ✗ Menghapus: $KEY"

      sed -i '' \
        "/^[[:space:]]*\(export[[:space:]]\+\)\?$KEY[[:space:]]*=/d" \
        "$ENV_FILE"

    fi

  done < "$ENV_FILE"

done

echo
echo "✓ Selesai membersihkan .env dan .env.local"