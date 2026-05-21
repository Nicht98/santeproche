import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export const db = drizzle(pool, { schema });

/** Raw SQL query helper */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}
