import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; phone: string; role: string };
  }
}
