import { FastifyPluginAsync } from 'fastify';
import { db } from '../infra/db.js';

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /appointments/available-slots
  fastify.get('/appointments/available-slots', async (request) => {
    const { providerId, date } = request.query as { providerId: string; date: string };
    // Simplified: generate slots from provider_schedules
    const schedules = await db.execute(
      'SELECT * FROM provider_schedules WHERE provider_id = $1 AND day_of_week = EXTRACT(DOW FROM $2::date) AND is_active = true',
      [providerId, date]
    );

    const slots: string[] = [];
    for (const sched of schedules) {
      let current = new Date(`${date}T${sched.start_time}`);
      const end = new Date(`${date}T${sched.end_time}`);
      while (current < end) {
        const timeStr = current.toTimeString().slice(0, 5);
        slots.push(timeStr);
        current.setMinutes(current.getMinutes() + sched.slot_duration_min);
      }
    }
    return { date, slots };
  });

  // POST /appointments
  fastify.post('/appointments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { providerId, facilityId, scheduledAt, durationMinutes, reason } = request.body as any;
    const patientId = request.user!.id;

    // Conflict check
    const [existing] = await db.execute(
      'SELECT id FROM appointments WHERE provider_id = $1 AND scheduled_at = $2 AND status IN ($3, $4)',
      [providerId, scheduledAt, 'pending', 'confirmed']
    );
    if (existing) {
      return reply.code(409).send({ error: { code: 'SLOT_TAKEN', message: 'Slot no longer available' } });
    }

    const [appointment] = await db.execute(
      'INSERT INTO appointments (patient_id, provider_id, facility_id, scheduled_at, duration_minutes, reason, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [patientId, providerId, facilityId, scheduledAt, durationMinutes || 30, reason, 'pending']
    );

    return reply.code(201).send(appointment);
  });
};
