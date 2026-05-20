import { FastifyPluginAsync } from 'fastify';
import { db } from '../infra/db.js';

export const facilityRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /facilities (nearby search)
  fastify.get('/facilities', async (request, reply) => {
    const { lat, lng, radius_km, kind, open_now, limit = '20', offset = '0' } = request.query as Record<string, string>;

    if (!lat || !lng) {
      return reply.code(400).send({ error: { code: 'MISSING_COORDS', message: 'lat and lng required' } });
    }

    const radius = parseFloat(radius_km || '5') * 1000;
    const kinds = kind ? kind.split(',') : ['pharmacy', 'hospital', 'clinic'];

    const facilities = await db.execute(`
      SELECT
        id, name, kind, address, phone, location::jsonb as location,
        ST_Distance(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) as distance_m,
        opening_hours, license_verified, is_active
      FROM facilities
      WHERE ST_DWithin(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, $3)
        AND kind = ANY($4)
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY distance_m ASC
      LIMIT $5 OFFSET $6
    `, [lng, lat, radius, kinds, limit, offset]);

    return { data: facilities };
  });

  // GET /facilities/:id
  fastify.get('/facilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [facility] = await db.execute('SELECT * FROM facilities WHERE id = $1 LIMIT 1', [id]);
    if (!facility) return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    return facility;
  });
};
