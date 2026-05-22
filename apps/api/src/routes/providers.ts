import { FastifyPluginAsync } from 'fastify';
import { eq, and, inArray, ilike, sql } from 'drizzle-orm';
import { query } from '../db/index.js';
import { db } from '../db/index.js';
import { users, providerProfiles, facilities, providerSchedules } from '../db/schema/index.js';

export const providerRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /providers — list active providers (searchable directory)
  fastify.get('/providers', async (request, _reply) => {
    const {
      role,
      facilityId,
      search,
      dayOfWeek,
      limit = '20',
      offset = '0',
    } = request.query as Record<string, string>;

    const l = Math.min(parseInt(limit, 10), 100);
    const os = parseInt(offset, 10);

    // Only list active provider roles
    const conditions = [
      eq(users.status, 'active'),
      sql`${users.deletedAt} IS NULL`,
      inArray(users.role, ['doctor', 'pharmacist', 'clinic_admin', 'hospital_admin']),
    ];

    if (role) {
      const roles = role.split(',') as ('doctor' | 'pharmacist' | 'clinic_admin' | 'hospital_admin')[];
      conditions.push(inArray(users.role, roles));
    }
    if (search) {
      conditions.push(
        ilike(users.displayName, `%${search}%`)
      );
    }

    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        jobTitle: providerProfiles.jobTitle,
        kycStatus: providerProfiles.kycStatus,
        facilityId: providerProfiles.facilityId,
        facilityName: facilities.name,
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .leftJoin(facilities, eq(providerProfiles.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(users.displayName)
      .limit(l)
      .offset(os);

    // If dayOfWeek filter requested, narrow to providers with active schedules that day
    let data = rows;
    if (dayOfWeek) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
      if (validDays.includes(dayOfWeek as typeof validDays[0])) {
        const providerIds = rows.map((r) => r.id);
        if (providerIds.length > 0) {
          const schedules = await db
            .select({ providerId: providerSchedules.providerId })
            .from(providerSchedules)
            .where(
              and(
                inArray(providerSchedules.providerId, providerIds),
                eq(providerSchedules.dayOfWeek, dayOfWeek as typeof validDays[0]),
                eq(providerSchedules.isActive, true)
              )
            );
          const availableSet = new Set(schedules.map((s) => s.providerId));
          data = rows.filter((r) => availableSet.has(r.id));
        }
      }
    }

    // If facilityId filter requested, narrow results
    if (facilityId) {
      data = data.filter((r) => r.facilityId === facilityId);
    }

    return {
      data,
      pagination: { limit: l, offset: os, count: data.length },
    };
  });

  // GET /providers/:id — provider details
  fastify.get('/providers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        jobTitle: providerProfiles.jobTitle,
        licenseNumber: providerProfiles.licenseNumber,
        kycStatus: providerProfiles.kycStatus,
        facilityId: providerProfiles.facilityId,
        facilityName: facilities.name,
        facilityAddress: facilities.address,
        facilityPhone: facilities.phone,
        facilityLat: facilities.lat,
        facilityLng: facilities.lng,
        resume: providerProfiles.resume,
        experience: providerProfiles.experience,
        workplaceName: providerProfiles.workplaceName,
        workplaceAddress: providerProfiles.workplaceAddress,
        workplaceLat: providerProfiles.workplaceLat,
        workplaceLng: providerProfiles.workplaceLng,
      })
      .from(users)
      .innerJoin(providerProfiles, eq(users.id, providerProfiles.userId))
      .leftJoin(facilities, eq(providerProfiles.facilityId, facilities.id))
      .where(
        and(
          eq(users.id, id),
          eq(users.status, 'active')
        )
      )
      .limit(1);

    if (!row) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Soignant introuvable.' } });
    }

    // Fetch weekly schedule
    const schedules = await db
      .select()
      .from(providerSchedules)
      .where(
        and(
          eq(providerSchedules.providerId, id),
          eq(providerSchedules.isActive, true)
        )
      )
      .orderBy(providerSchedules.dayOfWeek);

    const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const ordered = schedules.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));

    return { data: { ...row, schedules: ordered } };
  });

  // POST /providers/register
  fastify.post('/providers/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const userId = (request.user as { id: string }).id;

    // Update existing user: set display_name, role, status
    const kind = body.kind === 'doctor' ? 'doctor' : 'pharmacist';
    await db.update(users)
      .set({
        displayName: body.displayName,
        role: kind,
        status: 'pending_verification',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Create provider profile
    const existingProfile = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId)).limit(1);
    if (existingProfile.length === 0) {
      await db.insert(providerProfiles).values({
        userId,
        jobTitle: body.jobTitle,
        licenseNumber: body.licenseNumber,
        resume: body.resume,
        experience: body.experience,
        workplaceName: body.workplaceName,
        workplaceAddress: body.workplaceAddress,
        workplaceLat: body.workplaceLat,
        workplaceLng: body.workplaceLng,
        kycStatus: 'pending',
        kycSubmittedAt: new Date(),
      });
    } else {
      await db.update(providerProfiles)
        .set({
          jobTitle: body.jobTitle,
          licenseNumber: body.licenseNumber,
          resume: body.resume,
          experience: body.experience,
          workplaceName: body.workplaceName,
          workplaceAddress: body.workplaceAddress,
          workplaceLat: body.workplaceLat,
          workplaceLng: body.workplaceLng,
          kycStatus: 'pending',
          kycSubmittedAt: new Date(),
        })
        .where(eq(providerProfiles.userId, userId));
    }

    return reply.code(201).send({ userId, status: 'pending_verification' });
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
