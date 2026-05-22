import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { generateOtp, verifyOtp } from '../services/otp-service.js';
import { sendSms } from '../infra/kannel.js';
import { db } from '../db/index.js';
import { users, refreshTokens, patientProfiles, providerProfiles } from '../db/schema/index.js';
import crypto from 'crypto';

const OtpRequestSchema = z.object({
  phone: z.string().regex(/^\+237[0-9]{9}$/),
});

const OtpVerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/otp/request
  fastify.post('/auth/otp/request', async (request, reply) => {
    const body = OtpRequestSchema.parse(request.body);
    const otp = await generateOtp(body.phone);
    await sendSms(body.phone, `Votre code SanteProche: ${otp}`);
    return reply.code(202).send({ message: 'OTP sent', expiresInSeconds: 300 });
  });

  // POST /auth/otp/verify
  fastify.post('/auth/otp/verify', async (request, reply) => {
    const body = OtpVerifySchema.parse(request.body);
    const valid = await verifyOtp(body.phone, body.code);
    if (!valid) {
      return reply.code(400).send({ error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' } });
    }

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.phone, body.phone)).limit(1);

    if (!user) {
      const result = await db.insert(users).values({
        phone: body.phone,
        phoneVerified: true,
        role: 'patient',
        status: 'active',
      }).returning();
      user = result[0];
    } else if (!user.phoneVerified) {
      // Update phone_verified if it was false
      const result = await db.update(users)
        .set({ phoneVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = result[0];
    }

    const accessToken = fastify.jwt.sign(
      { id: user.id, phone: user.phone as string, role: user.role as string },
      { expiresIn: '15m' }
    );
    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: '7d' }
    );

    // Store refresh token hash in DB
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: request.headers['user-agent'] as string,
      ipAddress: request.ip,
    });

    let isProfileComplete = false;
    if (user) {
      if (user.role === 'patient') {
        const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, user.id)).limit(1);
        isProfileComplete = !!profile;
      } else {
        // For providers: check providerProfiles exists
        const [profile] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, user.id)).limit(1);
        isProfileComplete = !!profile;
      }
    }

    return { accessToken, refreshToken, isProfileComplete, user: { id: user.id, phone: user.phone, role: user.role, displayName: user.displayName } };
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(request.body);
    try {
      const decoded = fastify.jwt.verify(body.refreshToken) as { id: string };

      // Validate refresh token exists and is not revoked
      const tokenHash = hashToken(body.refreshToken);
      const [stored] = await db.select().from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!stored || stored.revoked || new Date() > stored.expiresAt) {
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } });
      }

      const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });

      // Rotate: revoke old token, issue new one
      await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, stored.id));

      const newAccessToken = fastify.jwt.sign(
        { id: user.id, phone: user.phone as string, role: user.role as string },
        { expiresIn: '15m' }
      );
      const newRefreshToken = fastify.jwt.sign(
        { id: user.id },
        { expiresIn: '7d' }
      );

      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: request.headers['user-agent'] as string,
        ipAddress: request.ip,
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });
    }
  });

  // POST /auth/logout
  fastify.post('/auth/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = z.object({ refreshToken: z.string().optional() }).parse(request.body);
    if (body.refreshToken) {
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.tokenHash, hashToken(body.refreshToken)));
    }
    return reply.code(204).send();
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
    return { user: request.user };
  });
};
