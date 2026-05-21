import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const drugRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /drugs — search drug catalog
  fastify.get('/drugs', async (request) => {
    const { q, category, form, limit = '50', offset = '0' } = request.query as Record<string, string>;

    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`(name ILIKE $${idx} OR generic_name ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }
    if (category) {
      conditions.push(`category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (form) {
      conditions.push(`form = $${idx}`);
      params.push(form);
      idx++;
    }

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const drugs = await query(
      `SELECT * FROM drugs WHERE ${conditions.join(' AND ')} ORDER BY name LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const [count] = await query(
      `SELECT COUNT(*) as total FROM drugs WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    ) as Array<{ total: string }>;

    return {
      data: drugs,
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), total: parseInt(count?.total || '0', 10), count: drugs.length },
    };
  });

  // GET /drugs/:id — single drug
  fastify.get('/drugs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [drug] = await query('SELECT * FROM drugs WHERE id = $1 LIMIT 1', [id]);
    if (!drug) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Drug not found' } });

    // Also include stock at nearby facilities if lat/lng provided
    const { lat, lng, radiusKm = '5' } = request.query as Record<string, string>;
    let stock: Record<string, any>[] = [];
    if (lat && lng) {
      const R = 6371;
      stock = await query(
        `SELECT ds.*, f.name as facility_name, f.address, f.phone, f.lat, f.lng,
          (${R} * acos(LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(f.lat::float)) *
            cos(radians(f.lng::float) - radians($2)) +
            sin(radians($1)) * sin(radians(f.lat::float))
          )))) as distance_km
        FROM drug_stock ds
        JOIN facilities f ON f.id = ds.facility_id
        WHERE ds.drug_id = $3 AND ds.is_in_stock = TRUE AND ds.is_available = TRUE
        HAVING distance_km <= $4
        ORDER BY distance_km ASC`,
        [parseFloat(lat), parseFloat(lng), id, parseFloat(radiusKm)]
      );
    }

    return { data: { ...drug, nearby: stock } };
  });

  // GET /drugs/stock — find which facilities have a specific drug
  fastify.get('/drugs/stock', async (request) => {
    const { drugId, lat, lng, radiusKm = '5', limit = '20', offset = '0' } = request.query as Record<string, string>;

    let where = "WHERE ds.drug_id = $1 AND ds.is_in_stock = TRUE AND ds.is_available = TRUE";
    let params: any[] = [drugId];
    let idx = 2;

    if (lat && lng) {
      const R = 6371;
      where += ` AND (${R} * acos(LEAST(1, GREATEST(-1,
        cos(radians($${idx})) * cos(radians(f.lat::float)) *
        cos(radians(f.lng::float) - radians($${idx + 1})) +
        sin(radians($${idx})) * sin(radians(f.lat::float))
      )))) <= $${idx + 2}`;
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
      idx += 3;
    }

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const stock = await query(
      `SELECT ds.*, f.name as facility_name, f.address, f.phone,
        f.lat, f.lng, f.kind, f.is_24h
      FROM drug_stock ds
      JOIN facilities f ON f.id = ds.facility_id
      ${where}
      LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return {
      data: stock,
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: stock.length },
    };
  });

  // ════════════════════════════════════════════════════════════════
  // PHARMACY / FACILITY MANAGEMENT ROUTES (auth required)
  // ════════════════════════════════════════════════════════════════

  // GET /facilities/:id/stock — view stock at a facility
  fastify.get('/facilities/:id/stock', async (request) => {
    const { id } = request.params as { id: string };
    const { q, category, inStock, limit = '50', offset = '0' } = request.query as Record<string, string>;

    const conditions: string[] = ['ds.facility_id = $1'];
    const params: (string | number)[] = [id];
    let idx = 2;

    if (q) {
      conditions.push(`(d.name ILIKE $${idx} OR d.generic_name ILIKE $${idx})`);
      params.push(`%${q}%`);
      idx++;
    }
    if (category) {
      conditions.push(`d.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (inStock === 'true') {
      conditions.push('ds.is_in_stock = TRUE');
    }

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const stock = await query(
      `SELECT ds.*, d.name, d.generic_name, d.category, d.form, d.unit, d.dosage, d.requires_prescription
       FROM drug_stock ds
       JOIN drugs d ON d.id = ds.drug_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return {
      data: stock,
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: stock.length },
    };
  });

  // POST /facilities/:id/stock — add/update stock for a drug
  fastify.post('/facilities/:id/stock', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { drugId, quantity, priceXaf, locationInStore } = request.body as Record<string, any>;
    const userId = request.user.id;

    // Verify user works at this facility
    const [profile] = await query(
      'SELECT id FROM provider_profiles WHERE user_id = $1 AND facility_id = $2 LIMIT 1',
      [userId, id]
    );
    if (!profile && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Only facility staff can manage stock' } });
    }

    const [drug] = await query('SELECT id FROM drugs WHERE id = $1 LIMIT 1', [drugId]);
    if (!drug) return reply.code(404).send({ error: { code: 'DRUG_NOT_FOUND', message: 'Drug not found in catalog' } });

    const [existing] = await query(
      'SELECT id FROM drug_stock WHERE facility_id = $1 AND drug_id = $2 LIMIT 1',
      [id, drugId]
    );

    if (existing) {
      const [updated] = await query(
        `UPDATE drug_stock
         SET quantity = $1, price_xaf = $2, location_in_store = $3, is_in_stock = ($1 > 0),
             is_available = TRUE, last_updated = NOW(), updated_by = $4
         WHERE id = $5 RETURNING *`,
        [quantity, priceXaf || null, locationInStore || null, userId, existing.id]
      );
      return { status: 'success', updated, action: 'updated' };
    } else {
      const [created] = await query(
        `INSERT INTO drug_stock (facility_id, drug_id, quantity, price_xaf, location_in_store, is_in_stock, is_available, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7) RETURNING *`,
        [id, drugId, quantity, priceXaf || null, locationInStore || null, quantity > 0, userId]
      );
      return reply.code(201).send({ status: 'success', stock: created, action: 'created' });
    }
  });

  // PATCH /facilities/:id/stock/:drugId — update stock quantity/price
  fastify.patch('/facilities/:id/stock/:drugId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, drugId } = request.params as { id: string; drugId: string };
    const { quantity, priceXaf, isAvailable, locationInStore } = request.body as Record<string, any>;
    const userId = request.user.id;

    // Verify user works at this facility
    const [profile] = await query(
      'SELECT id FROM provider_profiles WHERE user_id = $1 AND facility_id = $2 LIMIT 1',
      [userId, id]
    );
    if (!profile && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Only facility staff can manage stock' } });
    }

    const [existing] = await query(
      'SELECT id FROM drug_stock WHERE facility_id = $1 AND drug_id = $2 LIMIT 1',
      [id, drugId]
    );
    if (!existing) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'This drug is not in stock at this facility' } });
    }

    const updates: string[] = ['last_updated = NOW()', `updated_by = '${userId}'`];
    const values: any[] = [];

    if (quantity !== undefined) {
      updates.push(`quantity = $${values.length + 1}`);
      values.push(quantity);
      updates.push(`is_in_stock = $${values.length + 1}`);
      values.push(quantity > 0);
    }
    if (priceXaf !== undefined) {
      updates.push(`price_xaf = $${values.length + 1}`);
      values.push(priceXaf);
    }
    if (isAvailable !== undefined) {
      updates.push(`is_available = $${values.length + 1}`);
      values.push(isAvailable);
    }
    if (locationInStore !== undefined) {
      updates.push(`location_in_store = $${values.length + 1}`);
      values.push(locationInStore);
    }

    if (values.length === 0) return reply.code(400).send({ error: { code: 'NO_FIELDS', message: 'No fields to update' } });

    values.push(id, drugId);
    const [updated] = await query(
      `UPDATE drug_stock SET ${updates.join(', ')} WHERE facility_id = $${values.length - 1} AND drug_id = $${values.length} RETURNING *`,
      values
    );

    return { status: 'success', stock: updated };
  });

  // DELETE /facilities/:id/stock/:drugId — mark as out of stock
  fastify.delete('/facilities/:id/stock/:drugId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id, drugId } = request.params as { id: string; drugId: string };
    const userId = request.user.id;

    const [profile] = await query(
      'SELECT id FROM provider_profiles WHERE user_id = $1 AND facility_id = $2 LIMIT 1',
      [userId, id]
    );
    if (!profile && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Only facility staff can manage stock' } });
    }

    const [existing] = await query(
      'SELECT id FROM drug_stock WHERE facility_id = $1 AND drug_id = $2 LIMIT 1',
      [id, drugId]
    );
    if (!existing) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Drug not found in facility stock' } });

    await query(
      'UPDATE drug_stock SET is_available = FALSE, is_in_stock = FALSE, quantity = 0, last_updated = NOW(), updated_by = $1 WHERE id = $2',
      [userId, existing.id]
    );

    return { status: 'success', message: 'Drug marked as out of stock' };
  });
};
