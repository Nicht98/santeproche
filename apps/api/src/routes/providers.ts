import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, inArray, ilike, sql } from 'drizzle-orm';
import { query } from '../db/index.js';
import { db } from '../db/index.js';
import { users, providerProfiles, facilities, providerSchedules } from '../db/schema/index.js';

const MIN_RESUME_LEN = 50;

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
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
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

  // POST /providers/register — provider self-onboarding
  fastify.post('/providers/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const userId = (request.user as { id: string }).id;

    // ---------- 1. Zod validation ----------
    const RegisterSchema = z
      .object({
        displayName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères.").max(100, "Le nom complet ne doit pas dépasser 100 caractères."),
        kind: z.enum(["doctor", "pharmacist"], { message: "Type doit être 'doctor' ou 'pharmacist'." }),
        jobTitle: z.string().min(2, "La fonction doit contenir au moins 2 caractères.").max(100, "La fonction ne doit pas dépasser 100 caractères."),
        licenseNumber: z.string().min(3, "Le numéro de licence doit contenir au moins 3 caractères.").max(50, "Le numéro de licence ne doit pas dépasser 50 caractères."),
        resume: z.string().min(MIN_RESUME_LEN, `Le CV / Résumé doit contenir au moins ${MIN_RESUME_LEN} caractères.`).max(5000, "Le CV ne doit pas dépasser 5000 caractères."),
        experience: z.string().min(20, "L'expérience doit contenir au moins 20 caractères.").max(3000, "L'expérience ne doit pas dépasser 3000 caractères."),
        workplaceName: z.string().min(2, "Le nom de l'établissement doit contenir au moins 2 caractères.").max(150, "Le nom de l'établissement ne doit pas dépasser 150 caractères."),
        workplaceAddress: z.string().min(5, "L'adresse doit contenir au moins 5 caractères.").max(300, "L'adresse ne doit pas dépasser 300 caractères."),
        workplaceLat: z.string().refine((val) => val === '' || (!isNaN(+val) && +val >= -90 && +val <= 90), { message: "Latitude invalide (entre -90 et 90)." }).optional().default(''),
        workplaceLng: z.string().refine((val) => val === '' || (!isNaN(+val) && +val >= -180 && +val <= 180), { message: "Longitude invalide (entre -180 et 180)." }).optional().default(''),
      }, { required_error: "Données manquantes. Veuillez remplir tous les champs obligatoires." })
      .strict();

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      const fieldMessages: string[] = [];
      const fieldIssues: { field: string; message: string }[] = [];

      // map each field → first error message
      const FIELD_LABELS: Record<string, string> = {
        displayName: 'Nom complet',
        kind: 'Type',
        jobTitle: 'Fonction / Spécialité',
        licenseNumber: 'Numéro de licence',
        resume: 'CV / Résumé',
        experience: 'Expérience',
        workplaceName: "Établissement de travail",
        workplaceAddress: "Adresse de l'établissement",
        workplaceLat: 'Latitude',
        workplaceLng: 'Longitude',
      };

      for (const [field, messages] of Object.entries(fieldErrors)) {
        const label = FIELD_LABELS[field] || field;
        if (Array.isArray(messages) && messages.length > 0) {
          fieldMessages.push(`${label} : ${messages[0]}`);
          fieldIssues.push({ field, message: messages[0] });
        }
      }

      return reply.status(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: fieldMessages[0] || 'Requête invalide.',
          fields: fieldIssues.map(i => i.field),
          details: fieldMessages,
        },
      });
    }
    const valid = parsed.data;

    // ---------- 2. Business rule: no duplicate pending registration ----------
    const existingProfile = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      const profile = existingProfile[0];
      if (profile.kycStatus === 'verified') {
        return reply.status(409).send({
          error: {
            code: 'ALREADY_VERIFIED',
            message: "Votre compte est déjà vérifié. Connectez-vous pour l'utiliser.",
          },
        });
      }
      if (profile.kycStatus === 'pending') {
        return reply.status(409).send({
          error: {
            code: 'ALREADY_PENDING',
            message: "Une demande est déjà en cours de vérification. Veuillez patienter.",
          },
        });
      }
    }

    // ---------- 3. Update user role & status ----------
    const kind = valid.kind === 'doctor' ? 'doctor' : 'pharmacist';
    await db.update(users)
      .set({
        displayName: valid.displayName,
        role: kind,
        status: 'pending_verification',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // ---------- 4. Upsert provider profile ----------
    const profileData = {
      jobTitle: valid.jobTitle,
      licenseNumber: valid.licenseNumber,
      resume: valid.resume,
      experience: valid.experience,
      workplaceName: valid.workplaceName,
      workplaceAddress: valid.workplaceAddress,
      workplaceLat: valid.workplaceLat || null,
      workplaceLng: valid.workplaceLng || null,
      kycStatus: 'pending' as const,
      kycSubmittedAt: new Date(),
    };

    if (existingProfile.length === 0) {
      await db.insert(providerProfiles).values({
        userId,
        ...profileData,
      });
    } else {
      await db.update(providerProfiles)
        .set(profileData)
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
