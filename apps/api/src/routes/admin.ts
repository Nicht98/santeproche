import { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../db/migrate.js';

// Simple admin check — in production, restrict to admin JWT or IP whitelist
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/health/db — migration and DB state
  fastify.get('/admin/health/db', async (request, reply) => {
    const auth = request.headers['x-admin-secret'];
    if (auth !== ADMIN_SECRET) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    });

    try {
      // Check migrations table
      const migrationsRes = await pool.query(
        'SELECT hash, created_at FROM drizzle_migrations ORDER BY id'
      );

      // Check patient_profiles columns
      const columnsRes = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'patient_profiles'
        ORDER BY ordinal_position
      `);

      // Check users count
      const usersRes = await pool.query('SELECT COUNT(*) as count FROM users');

      return {
        migrations: migrationsRes.rows,
        patientProfileColumns: columnsRes.rows,
        userCount: parseInt(usersRes.rows[0].count, 10),
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'),
      };
    } finally {
      await pool.end();
    }
  });

  // POST /admin/migrate — force run pending migrations
  fastify.post('/admin/migrate', async (request, reply) => {
    const auth = request.headers['x-admin-secret'];
    if (auth !== ADMIN_SECRET) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
    }

    const result = await migrate();
    return {
      status: 'done',
      applied: result.applied,
      skipped: result.skipped,
      errors: result.errors,
    };
  });
};
