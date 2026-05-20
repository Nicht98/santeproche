import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export const db = drizzle(pool);

/** Raw SQL query helper that returns rows array ( compatible with old stubs ) */
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}
