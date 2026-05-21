import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, inArray, gte, lte, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { appointments, facilities, users, providerProfiles } from '../db/schema/index.js';

const CreateAppointmentSchema = z.object({
  providerId: z.string().uuid(),
  facilityId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(240).optional().default(30),
  reason: z.string().max(500).optional(),
});

const UpdateAppointmentSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().max(2000).optional(),
});

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /appointments/available-slots — query slots by provider
  fastify.get('/appointments/available-slots', async (request) => {
    const { providerId, date } = request.query as { providerId: string; date: string };

    // This endpoint now redirects to the facility-based slot finder
    // If you know the provider but not the facility, we find their primary facility
    const [provider] = await db
      .select({ facilityId: providerProfiles.facilityId })
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, providerId))
      .limit(1);

    if (!provider?.facilityId) {
      return { date, slots: [], message: 'Provider has no assigned facility' };
    }

    // Forward to facility slot endpoint logic
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayNames[new Date(date).getDay()];

    const { providerSchedules } = await import('../db/schema/index.js');
    const schedules = await db
      .select()
      .from(providerSchedules)
      .where(
        and(
          eq(providerSchedules.facilityId, provider.facilityId),
          eq(providerSchedules.providerId, providerId),
          eq(providerSchedules.dayOfWeek, dayOfWeek),
          eq(providerSchedules.isActive, true)
        )
      );

    if (schedules.length === 0) {
      return { date, dayOfWeek, slots: [] };
    }

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const booked = await db
      .select({ scheduledAt: appointments.scheduledAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          gte(appointments.scheduledAt, dayStart),
          lte(appointments.scheduledAt, dayEnd),
          inArray(appointments.status, ['pending', 'confirmed'])
        )
      );

    const bookedSet = new Set(booked.map((b) => b.scheduledAt.toISOString()));

    const slots: Array<{ time: string; available: boolean }> = [];
    for (const sched of schedules) {
      let [h, m] = sched.startTime.split(':').map(Number);
      const [endH, endM] = sched.endTime.split(':').map(Number);
      const endMinutes = endH * 60 + endM;

      while (h * 60 + m < endMinutes) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(`${date}T${timeStr}:00Z`);
        slots.push({
          time: timeStr,
          available: !bookedSet.has(slotDate.toISOString()),
        });
        m += sched.slotDurationMin;
        if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
      }
    }

    return { date, dayOfWeek, slots };
  });

  // POST /appointments — book an appointment
  fastify.post('/appointments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = CreateAppointmentSchema.parse(request.body);
    const patientId = request.user.id;

    // Verify provider exists and is active
    const [provider] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, body.providerId), eq(users.status, 'active')))
      .limit(1);

    if (!provider) {
      return reply.code(404).send({ error: { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found or inactive' } });
    }

    // Conflict check: same provider, same time, pending/confirmed
    const scheduledAt = new Date(body.scheduledAt);
    const [existing] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, body.providerId),
          eq(appointments.scheduledAt, scheduledAt),
          inArray(appointments.status, ['pending', 'confirmed'])
        )
      )
      .limit(1);

    if (existing) {
      return reply.code(409).send({ error: { code: 'SLOT_TAKEN', message: 'This time slot is no longer available' } });
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        patientId,
        providerId: body.providerId,
        facilityId: body.facilityId || null,
        scheduledAt,
        durationMinutes: body.durationMinutes,
        reason: body.reason || null,
        status: 'pending',
      })
      .returning();

    return reply.code(201).send({
      status: 'success',
      message: 'Appointment booked',
      appointment,
    });
  });

  // GET /appointments/me — list my appointments (patient or provider)
  fastify.get('/appointments/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { status, limit = '20', offset = '0' } = request.query as Record<string, string>;

    const conditions = [
      eq(appointments.patientId, userId),
    ];

    if (status) {
      conditions.push(eq(appointments.status, status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'));
    }

    const rows = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        providerId: appointments.providerId,
        facilityId: appointments.facilityId,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        reason: appointments.reason,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        providerName: users.displayName,
        facilityName: facilities.name,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.providerId, users.id))
      .leftJoin(facilities, eq(appointments.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.scheduledAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    return { data: rows, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: rows.length } };
  });

  // GET /appointments/provider — list appointments where I am the provider
  fastify.get('/appointments/provider', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { status, limit = '20', offset = '0' } = request.query as Record<string, string>;

    const conditions = [
      eq(appointments.providerId, userId),
    ];

    if (status) {
      conditions.push(eq(appointments.status, status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'));
    }

    const rows = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        providerId: appointments.providerId,
        facilityId: appointments.facilityId,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        reason: appointments.reason,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patientName: users.displayName,
        patientPhone: users.phone,
        facilityName: facilities.name,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.patientId, users.id))
      .leftJoin(facilities, eq(appointments.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.scheduledAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    return { data: rows, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: rows.length } };
  });

  // GET /appointments/:id
  fastify.get('/appointments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [appt] = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        providerId: appointments.providerId,
        facilityId: appointments.facilityId,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        reason: appointments.reason,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        cancelledAt: appointments.cancelledAt,
        providerName: users.displayName,
        facilityName: facilities.name,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.providerId, users.id))
      .leftJoin(facilities, eq(appointments.facilityId, facilities.id))
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appt) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    // Only patient or provider can view
    if (appt.patientId !== userId && appt.providerId !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not authorized to view this appointment' } });
    }

    return appt;
  });

  // PATCH /appointments/:id — update status (patient can cancel, provider can confirm/complete)
  fastify.patch('/appointments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const body = UpdateAppointmentSchema.parse(request.body);

    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appt) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    const isPatient = appt.patientId === userId;
    const isProvider = appt.providerId === userId;

    if (!isPatient && !isProvider) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN' } });
    }

    // Authorization rules
    if (body.status === 'cancelled') {
      if (!isPatient && !isProvider) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Only the patient or provider can cancel' } });
      }
    } else if (body.status === 'confirmed' || body.status === 'completed' || body.status === 'no_show') {
      if (!isProvider) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Only the provider can confirm or complete' } });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = userId;
    }
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();

    return { status: 'success', appointment: updated };
  });

  // POST /appointments/:id/cancel — explicit cancellation with reason
  fastify.post('/appointments/:id/cancel', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const { reason } = request.body as { reason?: string };

    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appt) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    if (appt.status === 'cancelled') {
      return reply.code(409).send({ error: { code: 'ALREADY_CANCELLED', message: 'Appointment is already cancelled' } });
    }

    const isPatient = appt.patientId === userId;
    const isProvider = appt.providerId === userId;

    if (!isPatient && !isProvider) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not authorized to cancel this appointment' } });
    }

    // Cancellation policy: must be at least 2 hours before scheduled time
    const hoursUntil = (new Date(appt.scheduledAt).getTime() - Date.now()) / 3600000;
    if (hoursUntil < 2) {
      return reply.code(409).send({ error: { code: 'TOO_LATE', message: 'Appointments can only be cancelled at least 2 hours in advance' } });
    }

    const [updated] = await db
      .update(appointments)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId,
        notes: reason ? `${appt.notes || ''}\n[CANCEL REASON]: ${reason}`.trim() : appt.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    return {
      status: 'success',
      message: 'Appointment cancelled',
      appointment: updated,
    };
  });
};
