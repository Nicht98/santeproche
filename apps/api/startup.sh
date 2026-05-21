#!/bin/sh
set -e

echo "Running database migrations..."

node -e "
const { Pool } = require('pg');
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

(async () => {
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  \`);

  const migrationsDir = join(process.cwd(), 'dist', 'db', 'migrations');
  let files = [];
  try {
    files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.log('No migrations directory found, skipping.');
    await pool.end();
    process.exit(0);
  }

  for (const file of files) {
    const hash = file.replace('.sql', '');
    const alreadyRun = await pool.query(
      'SELECT 1 FROM drizzle_migrations WHERE hash = \$1',
      [hash]
    );
    if (alreadyRun.rowCount > 0) {
      console.log('Migration ' + file + ' already applied.');
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log('Applying migration: ' + file + '...');
    await pool.query(sql);
    await pool.query('INSERT INTO drizzle_migrations (hash) VALUES (\$1)', [hash]);
    console.log('Applied migration: ' + file);
  }

  await pool.end();
})();
"

echo "Starting server..."
exec node dist/main.js
