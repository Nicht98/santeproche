#!/bin/sh
set -e

echo "========================================"
echo "Running database migrations..."
echo "========================================"
node dist/db/migrate.js
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Migration failed with exit code $EXIT_CODE"
  echo "Server will NOT start until migrations succeed."
  echo ""
  exit 1
fi

echo ""
echo "========================================"
echo "Starting server..."
echo "========================================"
exec node dist/main.js
