import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, ilike, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { facilities, users, providerProfiles, cities, appointments, providerSchedules } from '../db/schema/index.js';

const FacilityQuerySchema = z.object({
  cityId: z.string().optional(),
  kind: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  radiusKm: z.string().optional().default('10'),
  search: z.string().optional(),
  openNow: z.string().optional(),
  hasEmergency: z.string().optional(),
  limit: z.string().optional().default('20'),
  offset: z.string().optional().default('0'),
});

export const facilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/facilities', async (request, _reply) => {
    const q = FacilityQuerySchema.parse(request.query);
    const limit = Math.min(parseInt(q.limit, 10), 100);
    const offset = parseInt(q.offset, 10);

    const conditions = [
      eq(facilities.isActive, true),
      sql`${facilities.deletedAt} IS NULL`,
    ];

    if (q.cityId) {
      conditions.push(eq(facilities.cityId, parseInt(q.cityId, 10)));
    }
    if (q.kind) {
      const kinds = q.kind.split(',') as ('pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'health_center' | 'dispensary' | 'maternity' | 'dental' | 'optical' | 'mental_health' | 'vaccination' | 'other')[];
      conditions.push(inArray(facilities.kind, kinds));
    }
    if (q.search) {
      conditions.push(sql`(${ilike(facilities.name, `%${q.search}%`)} OR ${ilike(facilities.address, `%${q.search}%`)})`);
    }
    if (q.hasEmergency === 'true') {
      conditions.push(eq(facilities.hasEmergency, true));
    }
    if (q.openNow === 'true') {
      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];
      const currentHour = String(now.getUTCHours()).padStart(2, '0');
      const currentMinute = String(now.getUTCMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      conditions.push(
        sql`CASE
          WHEN ${facilities.is24h} = true THEN true
          WHEN ${facilities.openingHours} IS NULL THEN false
          WHEN (${facilities.openingHours}->${currentDay}) IS NULL THEN false
          WHEN (${facilities.openingHours}->${currentDay}->>'open') IS NULL THEN false
          WHEN (${facilities.openingHours}->${currentDay}->>'close') IS NULL THEN false
          ELSE
            ((${facilities.openingHours}->${currentDay}->>'open')::time <= ${currentTime}::time
            AND (${facilities.openingHours}->${currentDay}->>'close')::time >= ${currentTime}::time)
        END`
      );
    }

    let data;
    if (q.lat && q.lng) {
      // SQL-level haversine distance for accurate filtering + sorting
      const lat = parseFloat(q.lat);
      const lng = parseFloat(q.lng);
      const radiusKm = parseFloat(q.radiusKm || '10');
      const R = 6371;

      const distanceExpr = sql`(
        ${R} * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(${lat})) * cos(radians(${facilities.lat}::float)) *
            cos(radians(${facilities.lng}::float) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(${facilities.lat}::float))
          ))
        )
      )`;

      const rows = await db
        .select({
          id: facilities.id,
          name: facilities.name,
          kind: facilities.kind,
          status: facilities.status,
          address: facilities.address,
          phone: facilities.phone,
          email: facilities.email,
          lat: facilities.lat,
          lng: facilities.lng,
          openingHours: facilities.openingHours,
          is24h: facilities.is24h,
          hasEmergency: facilities.hasEmergency,
          licenseVerified: facilities.licenseVerified,
          cityName: cities.name,
          createdAt: facilities.createdAt,
          distanceKm: distanceExpr.as('distance_km'),
        })
        .from(facilities)
        .leftJoin(cities, eq(facilities.cityId, cities.id))
        .where(and(...conditions, sql`${distanceExpr} <= ${radiusKm}`))
        .orderBy(sql`${distanceExpr}`)
        .limit(limit)
        .offset(offset);

      data = rows.map((r) => ({ ...r, distanceKm: r.distanceKm ? parseFloat(r.distanceKm as string) : null }));
    } else {
      const rows = await db
        .select({
          id: facilities.id,
          name: facilities.name,
          kind: facilities.kind,
          status: facilities.status,
          address: facilities.address,
          phone: facilities.phone,
          email: facilities.email,
          lat: facilities.lat,
          lng: facilities.lng,
          openingHours: facilities.openingHours,
          is24h: facilities.is24h,
          hasEmergency: facilities.hasEmergency,
          licenseVerified: facilities.licenseVerified,
          cityName: cities.name,
          createdAt: facilities.createdAt,
        })
        .from(facilities)
        .leftJoin(cities, eq(facilities.cityId, cities.id))
        .where(and(...conditions))
        .orderBy(facilities.name)
        .limit(limit)
        .offset(offset);

      data = rows;
    }

    return {
      data,
      pagination: { limit, offset, count: data.length },
    };
  });

  // GET /facilities/nearby — legacy compatible endpoint
  // Must be registered BEFORE /facilities/:id to avoid shadowing
  fastify.get('/facilities/nearby', async (request, reply) => {
    const { latitude, longitude, radius, limit: nearbyLimit } = request.query as Record<string, string>;

    if (!latitude || !longitude) {
      return reply.code(400).send({ error: { code: 'MISSING_PARAMS', message: 'latitude and longitude required' } });
    }

    // Redirect to the unified /facilities endpoint with query params
    const params = new URLSearchParams();
    params.set('lat', latitude);
    params.set('lng', longitude);
    params.set('radiusKm', radius || '10');
    params.set('limit', nearbyLimit || '20');
    return reply.redirect(`/api/v1/facilities?${params.toString()}`);
  });

  // GET /facilities/:id
  fastify.get('/facilities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [facility] = await db
      .select({
        id: facilities.id,
        name: facilities.name,
        kind: facilities.kind,
        status: facilities.status,
        address: facilities.address,
        phone: facilities.phone,
        email: facilities.email,
        lat: facilities.lat,
        lng: facilities.lng,
        openingHours: facilities.openingHours,
        is24h: facilities.is24h,
        hasEmergency: facilities.hasEmergency,
        licenseNumber: facilities.licenseNumber,
        licenseVerified: facilities.licenseVerified,
        isActive: facilities.isActive,
        cityName: cities.name,
        cityRegion: cities.region,
        createdAt: facilities.createdAt,
      })
      .from(facilities)
      .leftJoin(cities, eq(facilities.cityId, cities.id))
      .where(and(eq(facilities.id, id), sql`${facilities.deletedAt} IS NULL`))
      .limit(1);

    if (!facility) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Facility not found' } });
    }

    // Get providers at this facility
    const providers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        role: users.role,
        jobTitle: providerProfiles.jobTitle,
        isPrimaryContact: providerProfiles.isPrimaryContact,
        kycStatus: providerProfiles.kycStatus,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(
        and(
          eq(providerProfiles.facilityId, id),
          eq(users.status, 'active'),
          sql`${users.deletedAt} IS NULL`
        )
      );

    return { ...facility, providers };
  });

  // GET /facilities/:id/available-slots — available booking slots for a date
  fastify.get('/facilities/:id/available-slots', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { date, providerId } = request.query as { date: string; providerId?: string };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: { code: 'INVALID_DATE', message: 'date required (YYYY-MM-DD)' } });
    }

    // Map JS day (0=Sun) to enum
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayOfWeek = dayNames[new Date(date).getDay()];

    // Find schedules for this facility + day
    const schedQuery = providerId
      ? and(
          eq(providerSchedules.facilityId, id),
          eq(providerSchedules.providerId, providerId),
          eq(providerSchedules.dayOfWeek, dayOfWeek),
          eq(providerSchedules.isActive, true)
        )
      : and(
          eq(providerSchedules.facilityId, id),
          eq(providerSchedules.dayOfWeek, dayOfWeek),
          eq(providerSchedules.isActive, true)
        );

    const schedules = await db
      .select()
      .from(providerSchedules)
      .where(schedQuery);

    if (schedules.length === 0) {
      return { date, dayOfWeek, slots: [] };
    }

    // Get booked slots
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const booked = await db
      .select({ scheduledAt: appointments.scheduledAt, providerId: appointments.providerId })
      .from(appointments)
      .where(
        and(
          eq(appointments.facilityId, id),
          gte(appointments.scheduledAt, dayStart),
          lte(appointments.scheduledAt, dayEnd),
          inArray(appointments.status, ['pending', 'confirmed'])
        )
      );

    const bookedSet = new Set(booked.map((b) => `${b.providerId}_${b.scheduledAt.toISOString()}`));

    // Generate slots
    const slots: Array<{ time: string; providerId: string; available: boolean }> = [];
    for (const sched of schedules) {
      let [h, m] = sched.startTime.split(':').map(Number);
      const [endH, endM] = sched.endTime.split(':').map(Number);
      const endMinutes = endH * 60 + endM;

      while (h * 60 + m < endMinutes) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(`${date}T${timeStr}:00Z`);
        const key = `${sched.providerId}_${slotDate.toISOString()}`;
        slots.push({
          time: timeStr,
          providerId: sched.providerId,
          available: !bookedSet.has(key),
        });
        m += sched.slotDurationMin;
        if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
      }
    }

    return { date, dayOfWeek, slots };
  });
};
