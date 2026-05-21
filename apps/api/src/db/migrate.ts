import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = join(process.cwd(), 'dist', 'db', 'migrations');
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    console.log('No migrations directory found, skipping.');
    await pool.end();
    return;
  }

  for (const file of files) {
    const hash = file.replace('.sql', '');
    const alreadyRun = await pool.query(
      'SELECT 1 FROM drizzle_migrations WHERE hash = $1',
      [hash]
    );
    if (alreadyRun.rowCount && alreadyRun.rowCount > 0) {
      console.log(`Migration ${file} already applied, skipping.`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Applying migration: ${file}...`);
    await pool.query(sql);
    await pool.query('INSERT INTO drizzle_migrations (hash) VALUES ($1)', [hash]);
    console.log(`Applied migration: ${file}`);
  }

  await pool.end();
}
