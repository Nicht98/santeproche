import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateOtp, verifyOtp } from '../services/otp-service.js';
import { sendSms } from '../infra/kannel.js';
import { query } from '../infra/db.js';

const OtpRequestSchema = z.object({
  phone: z.string().regex(/^\+237[0-9]{9}$/),
});

const OtpVerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/otp/request
  fastify.post('/auth/otp/request', async (request, reply) => {
    const body = OtpRequestSchema.parse(request.body);
    const otp = await generateOtp(body.phone);
    await sendSms(body.phone, `Your SanteProche code: ${otp}`);
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
    let users = await query(
      'SELECT id, phone, role FROM users WHERE phone = $1 LIMIT 1',
      [body.phone]
    );
    let user = users[0] as { id: string; phone: string; role: string };

    if (!user) {
      const result = await query(
        'INSERT INTO users (phone, phone_verified, role) VALUES ($1, true, $2) RETURNING id, phone, role',
        [body.phone, 'patient']
      );
      user = result[0] as { id: string; phone: string; role: string };
    }

    const accessToken = fastify.jwt.sign({ id: user.id, phone: user.phone, role: user.role }, { expiresIn: '15m' });
    const refreshToken = fastify.jwt.sign({ id: user.id }, { expiresIn: '7d' });

    return { accessToken, refreshToken, user };
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(request.body);
    try {
      const decoded = fastify.jwt.verify(body.refreshToken) as { id: string };
      const users = await query('SELECT id, phone, role FROM users WHERE id = $1 LIMIT 1', [decoded.id]);
      const user = users[0] as { id: string; phone: string; role: string };
      if (!user) return reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });
      const accessToken = fastify.jwt.sign({ id: user.id, phone: user.phone, role: user.role }, { expiresIn: '15m' });
      return { accessToken };
    } catch {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });
    }
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
    return { user: request.user };
  });
};
