import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const sosRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /sos — create emergency request
  fastify.post('/sos', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { lat, lng, address, description, phone, bloodType, allergies, emergencyContactName, emergencyContactPhone } = request.body as {
      lat?: number;
      lng?: number;
      address?: string;
      description?: string;
      phone?: string;
      bloodType?: string;
      allergies?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    };
    const requesterId = request.user.id;

    const [sos] = await query(
      `INSERT INTO sos_requests (requester_id, lat, lng, address, description, phone, blood_type, allergies, emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        requesterId,
        lat || null,
        lng || null,
        address || null,
        description || null,
        phone || null,
        bloodType || null,
        allergies || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
      ]
    );

    // We could also broadcast to nearby providers/facilities
    return reply.code(201).send({ status: 'success', sos });
  });

  // GET /sos/nearby — list active emergency requests nearby (for providers/admins)
  fastify.get('/sos/nearby', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { lat, lng, radiusKm = '10' } = request.query as Record<string, string>;
    const { role } = request.user;

    if (role !== 'provider' && role !== 'admin' && role !== 'doctor') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seuls les soignants et admins peuvent voir les urgences.' } });
    }

    if (!lat || !lng) {
      return reply.code(400).send({ error: { code: 'MISSING_COORDS', message: 'Latitude et longitude requises.' } });
    }

    const R = 6371;
    const items = await query(
      `SELECT *,
        (${R} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(lat::float)) *
            cos(radians(lng::float) - radians($2)) +
            sin(radians($1)) * sin(radians(lat::float))
          ))
        )) as distance_km
      FROM sos_requests
      WHERE status = 'active'
      HAVING distance_km <= $3
      ORDER BY distance_km`,
      [parseFloat(lat), parseFloat(lng), parseFloat(radiusKm)]
    );

    return { data: items };
  });

  // GET /sos/me — my own SOS requests
  fastify.get('/sos/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '10', offset = '0' } = request.query as Record<string, string>;

    const items = await query(
      `SELECT * FROM sos_requests WHERE requester_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return { data: items, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: items.length } };
  });

  // PATCH /sos/:id/assign — assign provider to SOS (provider/admin)
  fastify.patch('/sos/:id/assign', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { providerId, facilityId } = request.body as { providerId?: string; facilityId?: string };
    const currentUserId = request.user.id;
    const { role } = request.user;

    if (role !== 'provider' && role !== 'admin' && role !== 'doctor') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seuls les soignants et admins peuvent assigner les urgences.' } });
    }

    const [sos] = await query(
      'SELECT status FROM sos_requests WHERE id = $1 LIMIT 1',
      [id]
    );
    if (!sos) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Demande d\'urgence introuvable.' } });
    }
    if (sos.status !== 'active') {
      return reply.code(400).send({ error: { code: 'ALREADY_HANDLED', message: 'Demande d\'urgence déjà traitée.' } });
    }

    const [updated] = await query(
      `UPDATE sos_requests
       SET assigned_provider_id = $1, assigned_facility_id = $2, status = 'assigned', updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [providerId || currentUserId, facilityId || null, id]
    );

    return { status: 'success', sos: updated };
  });

  // PATCH /sos/:id/resolve — mark SOS as resolved
  fastify.patch('/sos/:id/resolve', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.user.id;

    const [sos] = await query(
      'SELECT requester_id, assigned_provider_id, status FROM sos_requests WHERE id = $1 LIMIT 1',
      [id]
    );
    if (!sos) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Demande d\'urgence introuvable.' } });
    }
    if (sos.requester_id !== currentUserId && sos.assigned_provider_id !== currentUserId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Vous ne pouvez pas résoudre cette demande.' } });
    }

    const [updated] = await query(
      "UPDATE sos_requests SET status = 'resolved', resolved_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    return { status: 'success', sos: updated };
  });
};
