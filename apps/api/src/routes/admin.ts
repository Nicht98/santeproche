import { FastifyPluginAsync } from 'fastify';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, providerProfiles } from '../db/schema/index.js';
import { migrate } from '../db/migrate.js';

// Simple admin check -- in production, restrict to admin JWT or IP whitelist
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/health/db -- migration and DB state
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
      const migrationsRes = await pool.query(
        'SELECT hash, created_at FROM drizzle_migrations ORDER BY id'
      );
      const columnsRes = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'patient_profiles'
        ORDER BY ordinal_position
      `);
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

  // POST /admin/migrate -- force run pending migrations
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

  // GET /admin/providers/pending -- list providers awaiting validation
  fastify.get('/admin/providers/pending', async (request, reply) => {
    const auth = request.headers['x-admin-secret'];
    if (auth !== ADMIN_SECRET) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
    }

    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        phone: users.phone,
        role: users.role,
        status: users.status,
        jobTitle: providerProfiles.jobTitle,
        licenseNumber: providerProfiles.licenseNumber,
        kycStatus: providerProfiles.kycStatus,
        kycSubmittedAt: providerProfiles.kycSubmittedAt,
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .where(eq(providerProfiles.kycStatus, 'pending'))
      .orderBy(providerProfiles.kycSubmittedAt);

    return { data: rows };
  });

  // PATCH /admin/providers/:id/status -- approve or reject a provider
  fastify.patch('/admin/providers/:id/status', async (request, reply) => {
    const auth = request.headers['x-admin-secret'];
    if (auth !== ADMIN_SECRET) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Invalid admin secret' } });
    }

    const body = request.body as any;
    const userId = (request.params as { id: string }).id;
    const verdict = body.verdict;
    const reason = body.reason || '';

    if (!['verified', 'rejected'].includes(verdict)) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'verdict must be verified or rejected' } });
    }

    await db.update(providerProfiles)
      .set({ kycStatus: verdict, kycRejectionReason: verdict === 'rejected' ? reason : undefined })
      .where(eq(providerProfiles.userId, userId));

    if (verdict === 'verified') {
      await db.update(users)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return { userId, status: verdict };
  });
};
