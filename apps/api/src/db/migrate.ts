import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  errors: string[];
}

export async function migrate(): Promise<MigrationResult> {
  const result: MigrationResult = { applied: [], skipped: [], errors: [] };

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = join(process.cwd(), 'dist', 'db', 'migrations');
  console.log(`[MIGRATE] Looking for migrations in: ${migrationsDir}`);

  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    console.log(`[MIGRATE] Found ${files.length} migration file(s): ${files.join(', ')}`);
  } catch (err) {
    const msg = `No migrations directory found at ${migrationsDir}: ${(err as Error).message}`;
    console.log(`[MIGRATE] ${msg}`);
    result.errors.push(msg);
    await pool.end();
    return result;
  }

  for (const file of files) {
    const hash = file.replace('.sql', '');
    const alreadyRun = await pool.query(
      'SELECT 1 FROM drizzle_migrations WHERE hash = $1',
      [hash]
    );
    if (alreadyRun.rowCount && alreadyRun.rowCount > 0) {
      console.log(`[MIGRATE] ${file} already applied, skipping.`);
      result.skipped.push(file);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`[MIGRATE] Applying: ${file}...`);
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO drizzle_migrations (hash) VALUES ($1)', [hash]);
      console.log(`[MIGRATE] ✅ Applied: ${file}`);
      result.applied.push(file);
    } catch (err) {
      const msg = `Failed to apply ${file}: ${(err as Error).message}`;
      console.error(`[MIGRATE] ❌ ${msg}`);
      result.errors.push(msg);
      // Don't throw — collect all errors
    }
  }

  await pool.end();
  console.log(`[MIGRATE] Done. Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Errors: ${result.errors.length}`);
  return result;
}

// Auto-run when executed directly (node dist/db/migrate.js)
/* c8 ignore next 6 */
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().then((result) => {
    if (result.errors.length > 0) {
      console.error(`[MIGRATE] ${result.errors.length} error(s) occurred. Exiting with code 1.`);
      process.exit(1);
    }
  });
}
