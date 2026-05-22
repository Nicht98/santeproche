import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, patientProfiles, cities } from '../db/schema/index.js';

const RegisterSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.string().optional().refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Format de date invalide. Utilisez AAAA-MM-JJ.',
  }),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  address: z.string().max(500).optional(),
  cityId: z.number().int().positive().optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().regex(/^\+?[0-9\s\-]{6,20}$/).optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
});

const UpdateSchema = RegisterSchema.partial();

export const patientRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /patients/register — create patient profile after OTP
  fastify.post('/patients/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    const userId = request.user.id;

    // Check if profile already exists
    const [existing] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);
    if (existing) {
      return reply.code(409).send({
        error: { code: 'PROFILE_EXISTS', message: 'Profil déjà existant. Modifiez-le via les paramètres.' },
      });
    }

    // Update user display name
    const displayName = `${body.firstName} ${body.lastName}`;
    await db.update(users)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Create patient profile
    const [profile] = await db.insert(patientProfiles).values({
      userId,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      gender: body.gender || null,
      bloodType: body.bloodType || null,
      address: body.address || null,
      cityId: body.cityId || null,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      allergies: body.allergies || null,
    }).returning();

    // Return enriched user data
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    return {
      status: 'success',
      message: 'Patient profile created',
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        profile: {
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          bloodType: profile.bloodType,
          address: profile.address,
          cityId: profile.cityId,
          emergencyContactName: profile.emergencyContactName,
          emergencyContactPhone: profile.emergencyContactPhone,
          allergies: profile.allergies,
        },
      },
    };
  });

  // GET /patients/me — get current patient profile
  fastify.get('/patients/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
    }

    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);

    let city = null;
    if (profile?.cityId) {
      const [cityRow] = await db.select().from(cities).where(eq(cities.id, profile.cityId)).limit(1);
      city = cityRow || null;
    }

    return {
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.status,
        preferredLang: user.preferredLang,
        createdAt: user.createdAt,
      },
      profile: profile
        ? {
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            bloodType: profile.bloodType,
            address: profile.address,
            city: city
              ? {
                  id: city.id,
                  name: city.name,
                  region: city.region,
                }
              : null,
            emergencyContactName: profile.emergencyContactName,
            emergencyContactPhone: profile.emergencyContactPhone,
            allergies: profile.allergies,
          }
        : null,
      isProfileComplete: !!profile,
    };
  });

  // PATCH /patients/me — update patient profile
  fastify.patch('/patients/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = UpdateSchema.parse(request.body);
    const userId = request.user.id;

    const [existing] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId)).limit(1);
    if (!existing) {
      return reply.code(404).send({
        error: { code: 'PROFILE_NOT_FOUND', message: 'Profil introuvable. Inscrivez-vous d\'abord.' },
      });
    }

    // Update display name if firstName/lastName provided
    if (body.firstName || body.lastName) {
      const currentName = (await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1))[0]?.displayName || '';
      const parts = currentName.split(' ');
      const firstName = body.firstName || parts[0] || '';
      const lastName = body.lastName || parts.slice(1).join(' ') || '';
      const displayName = `${firstName} ${lastName}`.trim();
      await db.update(users).set({ displayName, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.bloodType !== undefined) updateData.bloodType = body.bloodType;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.cityId !== undefined) updateData.cityId = body.cityId;
    if (body.emergencyContactName !== undefined) updateData.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = body.emergencyContactPhone;
    if (body.allergies !== undefined) updateData.allergies = body.allergies;

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(patientProfiles).set(updateData).where(eq(patientProfiles.userId, userId));
    }

    return { status: 'success', message: 'Profile updated' };
  });
};
