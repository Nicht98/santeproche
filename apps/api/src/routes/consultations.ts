import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const consultationRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /consultation-records — create record after appointment
  fastify.post('/consultation-records', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { appointmentId, diagnosis, symptoms, treatment, notes, followUpRequired, followUpDate, attachments } = request.body as {
      appointmentId: string;
      diagnosis?: string;
      symptoms?: string;
      treatment?: string;
      notes?: string;
      followUpRequired?: boolean;
      followUpDate?: string;
      attachments?: unknown[];
    };
    const providerId = request.user.id;

    // Verify appointment exists and belongs to this provider
    const [appt] = await query(
      'SELECT provider_id, patient_id, facility_id, status FROM appointments WHERE id = $1 LIMIT 1',
      [appointmentId]
    );
    if (!appt) {
      return reply.code(404).send({ error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Rendez-vous introuvable.' } });
    }
    if (appt.provider_id !== providerId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seul le soignant assigné peut créer un dossier.' } });
    }
    if (appt.status !== 'completed') {
      return reply.code(400).send({ error: { code: 'APPOINTMENT_NOT_COMPLETED', message: 'Un dossier ne peut être créé que pour un rendez-vous terminé.' } });
    }

    const [record] = await query(
      `INSERT INTO consultation_records (appointment_id, provider_id, patient_id, facility_id, diagnosis, symptoms, treatment, notes, follow_up_required, follow_up_date, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        appointmentId, providerId, appt.patient_id, appt.facility_id,
        diagnosis || null, symptoms || null, treatment || null, notes || null,
        followUpRequired || false, followUpDate || null,
        attachments ? JSON.stringify(attachments) : null,
      ]
    );

    return reply.code(201).send({ status: 'success', record });
  });

  // GET /consultation-records/me — my records (as patient)
  fastify.get('/consultation-records/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const records = await query(
      `SELECT r.*, u.display_name as provider_name, f.name as facility_name
       FROM consultation_records r
       JOIN users u ON u.id = r.provider_id
       LEFT JOIN facilities f ON f.id = r.facility_id
       WHERE r.patient_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return { data: records, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: records.length } };
  });

  // GET /consultation-records/provider/:id — list records for a provider
  fastify.get('/consultation-records/provider/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    // Provider can only see their own records, patients can see records of their providers
    if (id !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Non autorisé.' } });
    }

    const records = await query(
      `SELECT r.*, u.display_name as patient_name
       FROM consultation_records r
       JOIN users u ON u.id = r.patient_id
       WHERE r.provider_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    return { data: records, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: records.length } };
  });

  // GET /consultation-records/:id — single record
  fastify.get('/consultation-records/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [record] = await query(
      `SELECT r.*, u.display_name as provider_name, p.display_name as patient_name, f.name as facility_name
       FROM consultation_records r
       JOIN users u ON u.id = r.provider_id
       JOIN users p ON p.id = r.patient_id
       LEFT JOIN facilities f ON f.id = r.facility_id
       WHERE r.id = $1 AND r.deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (!record) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } });
    }
    if (record.provider_id !== userId && record.patient_id !== userId && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Non autorisé.' } });
    }

    return { data: record };
  });

  // PATCH /consultation-records/:id — update record (provider only)
  fastify.patch('/consultation-records/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const body = request.body as Record<string, any>;

    const [record] = await query(
      'SELECT provider_id FROM consultation_records WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (!record) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } });
    }
    if (record.provider_id !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seul le créateur peut modifier ce dossier.' } });
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      diagnosis: 'diagnosis',
      symptoms: 'symptoms',
      treatment: 'treatment',
      notes: 'notes',
      followUpRequired: 'follow_up_required',
      followUpDate: 'follow_up_date',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(body[key]);
      }
    }

    if (body.attachments !== undefined) {
      fields.push(`attachments = $${idx++}`);
      values.push(JSON.stringify(body.attachments));
    }

    if (fields.length === 0) {
      return reply.code(400).send({ error: { code: 'NO_FIELDS', message: 'Aucun champ à mettre à jour.' } });
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const [updated] = await query(
      `UPDATE consultation_records SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return { status: 'success', record: updated };
  });
};
