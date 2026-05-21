import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const providerRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /providers/register
  fastify.post('/providers/register', async (request, reply) => {
    const body = request.body as any;
    const userResult = await query(
      'INSERT INTO users (phone, display_name, role, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [body.phone, body.displayName, body.kind === 'doctor' ? 'doctor' : 'pharmacist', 'pending_verification']
    );
    const user = userResult[0] as { id: string; status: string };
    return reply.code(201).send({ userId: user.id, status: user.status });
  });

  // POST /providers/facility (register facility)
  fastify.post('/providers/facility', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const facilityResult = await query(
      'INSERT INTO facilities (name, kind, address, location, phone, opening_hours, created_by) VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326), $6, $7, $8) RETURNING *',
      [body.name, body.kind, body.address, body.lng, body.lat, body.phone, JSON.stringify(body.openingHours || []), (request.user as { id: string }).id]
    );
    const facility = facilityResult[0];
    return reply.code(201).send(facility);
  });
};
