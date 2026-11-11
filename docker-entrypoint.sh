#!/bin/sh
set -e

# Resolve data folder (same default as src/config/index.ts)
DATA_DIR="${DATA_FOLDER:-./data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  # Fix ownership only when needed (mounted volumes may be owned by root/host user)
  if [ "$(stat -c %u "$DATA_DIR")" != "1001" ] || \
     [ -n "$(find "$DATA_DIR" ! -user 1001 -print -quit 2>/dev/null)" ]; then
    echo "Fixing ownership of $DATA_DIR for nextjs (1001)..."
    chown -R nextjs:nodejs "$DATA_DIR" || echo "WARN: could not chown $DATA_DIR"
  fi
  exec su-exec nextjs:nodejs "$@"
fi

exec "$@"
