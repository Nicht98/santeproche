import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { eq } from 'drizzle-orm';
import { query } from './infra/db.js';
import { redis } from './infra/redis.js';
import { db } from './db/index.js';
import { users } from './db/schema/index.js';
import { authRoutes } from './routes/auth.js';
import { facilityRoutes } from './routes/facilities.js';
import { chatRoutes } from './routes/chat.js';
import { bookingRoutes } from './routes/booking.js';
import { providerRoutes } from './routes/providers.js';
import { patientRoutes } from './routes/patients.js';
import { adminRoutes } from './routes/admin.js';

import { reviewRoutes } from './routes/reviews.js';
import { notificationRoutes } from './routes/notifications.js';
import { prescriptionRoutes } from './routes/prescriptions.js';
import { consultationRoutes } from './routes/consultations.js';
import { drugRoutes } from './routes/drugs.js';
import { transportRoutes } from './routes/transport.js';
import { sosRoutes } from './routes/sos.js';
import { uploadRoutes } from './routes/upload.js';
import { wsRoutes } from './routes/ws.js';

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

// Simple in-memory metrics for /metrics endpoint
const metrics = {
  httpRequestsTotal: 0,
  httpRequestDurationSum: 0,
  httpRequestDurationCount: 0,
  startTime: Date.now(),
};

// Decorate fastify with authenticate
fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const userId = (request.user as { id: string }).id;

    // Check user status — reject suspended / rejected accounts
    const [user] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Compte invalide ou supprimé.' } });
    }

    if (user.status === 'rejected') {
      return reply.code(403).send({ error: { code: 'ACCOUNT_REJECTED', message: "Votre inscription a été refusée. Vous ne pouvez plus utiliser cette application." } });
    }

    if (user.status === 'suspended') {
      return reply.code(403).send({ error: { code: 'ACCOUNT_SUSPENDED', message: "Votre compte est suspendu. Contactez l'administrateur." } });
    }

  } catch (err) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } });
  }
});

// Metrics hook: count every request
fastify.addHook('onResponse', async (_request, reply) => {
  metrics.httpRequestsTotal++;
  metrics.httpRequestDurationSum += reply.elapsedTime;
  metrics.httpRequestDurationCount++;
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

// Metrics endpoint (Prometheus-compatible text format)
fastify.get('/metrics', async () => {
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;
  const avgDuration = metrics.httpRequestDurationCount > 0
    ? metrics.httpRequestDurationSum / metrics.httpRequestDurationCount
    : 0;
  return [
    '# HELP http_requests_total Total number of HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total ${metrics.httpRequestsTotal}`,
    '',
    '# HELP http_request_duration_seconds Average request duration',
    '# TYPE http_request_duration_seconds gauge',
    `http_request_duration_seconds ${avgDuration.toFixed(6)}`,
    '',
    '# HELP uptime_seconds Process uptime',
    '# TYPE uptime_seconds gauge',
    `uptime_seconds ${uptimeSeconds.toFixed(3)}`,
  ].join('\n');
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/v1' });
await fastify.register(facilityRoutes, { prefix: '/api/v1' });
await fastify.register(chatRoutes, { prefix: '/api/v1' });
await fastify.register(bookingRoutes, { prefix: '/api/v1' });
await fastify.register(providerRoutes, { prefix: '/api/v1' });
await fastify.register(patientRoutes, { prefix: '/api/v1' });
await fastify.register(adminRoutes, { prefix: '/api/v1' });
await fastify.register(reviewRoutes, { prefix: '/api/v1' });
await fastify.register(notificationRoutes, { prefix: '/api/v1' });
await fastify.register(prescriptionRoutes, { prefix: '/api/v1' });
await fastify.register(consultationRoutes, { prefix: '/api/v1' });
await fastify.register(sosRoutes, { prefix: '/api/v1' });
await fastify.register(drugRoutes, { prefix: '/api/v1' });
await fastify.register(transportRoutes, { prefix: '/api/v1' });
await fastify.register(uploadRoutes, { prefix: '/api/v1' });
await fastify.register(wsRoutes);

// Error handler
fastify.setErrorHandler((err, _req, reply) => {
  fastify.log.error(err);

  // Zod validation error → user-friendly BAD_REQUEST
  if (err.name === 'ZodError' && Array.isArray((err as any).issues)) {
    const issues = (err as any).issues as Array<{ path: (string | number)[]; message: string; code: string }>;
    const fields = issues.map((i) => i.path.join('.'));

    // Per-field friendly French messages
    const fieldMessages = issues.map((i) => {
      const field = i.path.join('.');
      const label = FIELD_LABELS[field] || field;
      switch (i.code) {
        case 'too_small': return `Le champ "${label}" est trop court.`;
        case 'too_big': return `Le champ "${label}" est trop long.`;
        case 'invalid_string':
          if (field === 'phone') return `"${label}" doit commencer par +237 suivi de 9 chiffres.`;
          return `"${label}" n'est pas valide.`;
        case 'invalid_type': return `"${label}" n'est pas du bon type.`;
        default: return `"${label}" n'est pas valide.`;
      }
    });

    reply.status(400).send({
      error: {
        code: 'BAD_REQUEST',
        message: fieldMessages[0],
        fields,
        details: fieldMessages,
      },
    });
    return;
  }

  reply.status(err.statusCode || 500).send({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    },
  });
});

const FIELD_LABELS: Record<string, string> = {
  phone: 'Numéro de téléphone',
  otp: 'Code OTP',
  firstName: 'Prénom',
  lastName: 'Nom',
  displayName: 'Nom complet',
  email: 'Adresse e-mail',
  password: 'Mot de passe',
  dateOfBirth: 'Date de naissance',
  emergencyContactName: 'Contact d\'urgence',
  emergencyContactPhone: 'Téléphone d\'urgence',
  address: 'Adresse',
  city: 'Ville',
  reason: 'Motif',
  notes: 'Notes',
  content: 'Contenu',
  providerId: 'Identifiant du soignant',
  facilityId: 'Identifiant de l\'établissement',
  scheduledAt: 'Date et heure',
  status: 'Statut',
  type: 'Type',
  kind: 'Type',
  name: 'Nom',
  lat: 'Latitude',
  lng: 'Longitude',
  radiusKm: 'Rayon (km)',
  title: 'Titre',
  subject: 'Sujet',
};

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  fastify.log.info(`Server listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
