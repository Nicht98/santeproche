import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const prescriptionRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /prescriptions — create a prescription (provider only)
  fastify.post('/prescriptions', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { recordId, patientId, facilityId, prescriptionNumber, diagnosisSummary, notes, validUntil, items } = request.body as {
      recordId: string;
      patientId: string;
      facilityId?: string;
      prescriptionNumber?: string;
      diagnosisSummary?: string;
      notes?: string;
      validUntil?: string;
      items: Array<{ drugName: string; dosage: string; frequency?: string; durationDays?: number; instructions?: string; quantity?: number }>;
    };
    const providerId = request.user.id;

    // Verify record exists and provider is the owner
    const [record] = await query(
      'SELECT provider_id FROM consultation_records WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
      [recordId]
    );
    if (!record) {
      return reply.code(404).send({ error: { code: 'RECORD_NOT_FOUND', message: 'Dossier de consultation introuvable.' } });
    }
    if (record.provider_id !== providerId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seul le soignant traitant peut créer des ordonnances.' } });
    }

    // Insert prescription
    const [prescription] = await query(
      `INSERT INTO prescriptions (record_id, patient_id, provider_id, facility_id, prescription_number, diagnosis_summary, notes, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [recordId, patientId, providerId, facilityId || null, prescriptionNumber || null, diagnosisSummary || null, notes || null, validUntil || null]
    );

    // Insert items
    const insertedItems = [];
    for (const item of items || []) {
      const [i] = await query(
        `INSERT INTO prescription_items (prescription_id, drug_name, dosage, frequency, duration_days, instructions, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [prescription.id, item.drugName, item.dosage, item.frequency || null, item.durationDays || null, item.instructions || null, item.quantity || null]
      );
      insertedItems.push(i);
    }

    return reply.code(201).send({ status: 'success', prescription: { ...prescription, items: insertedItems } });
  });

  // GET /prescriptions/me — my prescriptions (as patient)
  fastify.get('/prescriptions/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const prescriptions = await query(
      `SELECT p.*, u.display_name as provider_name
       FROM prescriptions p
       JOIN users u ON u.id = p.provider_id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    ) as Array<Record<string, any>>;

    // Load items for each
    const ids = prescriptions.map((p) => p.id);
    let items: Array<Record<string, any>> = [];
    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
      items = await query(
        `SELECT * FROM prescription_items WHERE prescription_id IN (${placeholders})`,
        ids
      );
    }

    const itemsByPrescription = items.reduce((acc, item: Record<string, any>) => {
      acc[item.prescription_id] = acc[item.prescription_id] || [];
      acc[item.prescription_id].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    const data = prescriptions.map((p: Record<string, any>) => ({ ...p, items: itemsByPrescription[p.id] || [] }));

    return { data, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: data.length } };
  });

  // GET /prescriptions/:id — single prescription
  fastify.get('/prescriptions/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [prescription] = await query(
      `SELECT p.*, u.display_name as provider_name
       FROM prescriptions p
       JOIN users u ON u.id = p.provider_id
       WHERE p.id = $1 LIMIT 1`,
      [id]
    );

    if (!prescription) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Ordonnance introuvable.' } });
    }
    if (prescription.patient_id !== userId && prescription.provider_id !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Vous ne pouvez pas voir cette ordonnance.' } });
    }

    const items = await query(
      'SELECT * FROM prescription_items WHERE prescription_id = $1',
      [id]
    );

    return { data: { ...prescription, items } };
  });

  // PATCH /prescriptions/:id/status — update status (provider or system)
  fastify.patch('/prescriptions/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const userId = request.user.id;

    const [prescription] = await query(
      'SELECT provider_id FROM prescriptions WHERE id = $1 LIMIT 1',
      [id]
    );
    if (!prescription) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Ordonnance introuvable.' } });
    }
    if (prescription.provider_id !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Seul le prescripteur peut changer le statut.' } });
    }

    const [updated] = await query(
      'UPDATE prescriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    return { status: 'success', prescription: updated };
  });
};
