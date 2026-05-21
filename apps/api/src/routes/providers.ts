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

  // POST /facilities/:id/stock
  fastify.post('/facilities/:id/stock', { preHandler: [fastify.authenticate] }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { drugId, status, quantity, notes } = request.body as any;

    const [stock] = await query(
      `INSERT INTO facility_stock (facility_id, drug_id, status, quantity, notes, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (facility_id, drug_id)
       DO UPDATE SET status = $3, quantity = $4, notes = $5, updated_by = $6, updated_at = NOW()
       RETURNING *`,
      [id, drugId, status, quantity, notes, (request.user as { id: string }).id]
    );
    return stock;
  });
};
