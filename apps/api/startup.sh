#!/bin/sh
set -e

echo "Running database migrations..."
node dist/db/migrate.js || {
  echo "Migration failed, starting server anyway..."
}

echo "Starting server..."
exec node dist/main.js
