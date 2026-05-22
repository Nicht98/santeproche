import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // Ensure upload dir exists
  try { await fs.mkdir(UPLOAD_DIR, { recursive: true }); } catch (_e) { /* ignore */ }

  // POST /upload/avatar — upload avatar for current user
  fastify.post('/upload/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: { code: 'NO_FILE', message: 'Aucun fichier téléchargé.' } });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: { code: 'INVALID_TYPE', message: 'Formats acceptés : JPEG, PNG, WebP uniquement.' } });
    }

    const ext = path.extname(data.filename) || '.jpg';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(filePath, await data.toBuffer());

    const avatarUrl = `/uploads/${fileName}`;

    // Update user avatar
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, request.user.id]);

    return { status: 'success', avatarUrl };
  });

  // POST /upload/facility/:id/avatar — upload facility logo/photo
  fastify.post('/upload/facility/:id/avatar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: { code: 'NO_FILE', message: 'Aucun fichier téléchargé.' } });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({ error: { code: 'INVALID_TYPE', message: 'Formats acceptés : JPEG, PNG, WebP uniquement.' } });
    }

    // Verify user has rights to this facility
    const [profile] = await query(
      'SELECT id FROM provider_profiles WHERE user_id = $1 AND facility_id = $2 LIMIT 1',
      [request.user.id, id]
    );
    if (!profile && request.user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Vous n\'êtes pas autorisé pour cet établissement.' } });
    }

    const ext = path.extname(data.filename) || '.jpg';
    const fileName = `facility_${id}_${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(filePath, await data.toBuffer());
    const avatarUrl = `/uploads/${fileName}`;

    await query('UPDATE facilities SET avatar_url = $1 WHERE id = $2', [avatarUrl, id]);

    return { status: 'success', avatarUrl };
  });
};
