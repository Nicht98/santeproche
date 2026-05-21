import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { query } from './infra/db.js';
import { redis } from './infra/redis.js';
import { authRoutes } from './routes/auth.js';
import { facilityRoutes } from './routes/facilities.js';
import { chatRoutes } from './routes/chat.js';
import { bookingRoutes } from './routes/booking.js';
import { providerRoutes } from './routes/providers.js';
import { patientRoutes } from './routes/patients.js';
import { adminRoutes } from './routes/admin.js';

// Validate critical env vars FIRST (before Fastify)
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty' },
    }),
  },
});

// Decorate fastify with authenticate
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } });
  }
});

// Register plugins
await fastify.register(cors, { origin: true, credentials: true });
await fastify.register(multipart);
await fastify.register(jwt, { secret: process.env.JWT_SECRET! });
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis,
});

// Health checks
fastify.get('/health', async () => ({ status: 'ok' }));
fastify.get('/ready', async () => {
  await query('SELECT 1');
  await redis.ping();
  return { status: 'ready' };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/v1' });
await fastify.register(facilityRoutes, { prefix: '/api/v1' });
await fastify.register(chatRoutes, { prefix: '/api/v1' });
await fastify.register(bookingRoutes, { prefix: '/api/v1' });
await fastify.register(providerRoutes, { prefix: '/api/v1' });
await fastify.register(patientRoutes, { prefix: '/api/v1' });
await fastify.register(adminRoutes, { prefix: '/api/v1' });

// Error handler
fastify.setErrorHandler((err, _req, reply) => {
  fastify.log.error(err);
  reply.status(err.statusCode || 500).send({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    },
  });
});

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  fastify.log.info(`Server listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
