#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

OUTPUT=".env.example"

echo "# Generated from .env and .env.local" > "$OUTPUT"
echo "# Values intentionally removed." >> "$OUTPUT"
echo >> "$OUTPUT"

for ENV_FILE in ".env" ".env.local"; do

  [[ -f "$ENV_FILE" ]] || continue

  echo "# ===== $ENV_FILE =====" >> "$OUTPUT"

  while IFS= read -r line || [[ -n "$line" ]]; do

    # Keep comments
    if [[ "$line" =~ ^[[:space:]]*# ]]; then
      echo "$line" >> "$OUTPUT"
      continue
    fi

    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Only process KEY=value
    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*= ]]; then

      KEY=$(echo "$line" | sed -E \
        's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*).*/\2/')

      echo "${KEY}=" >> "$OUTPUT"

    fi

  done < "$ENV_FILE"

  echo >> "$OUTPUT"

done

# Remove duplicate keys while preserving order
awk '!seen[$0]++ || $0 ~ /^#/ || $0 == ""' "$OUTPUT" > "$OUTPUT.tmp"
mv "$OUTPUT.tmp" "$OUTPUT"

echo "✓ Created $OUTPUT"