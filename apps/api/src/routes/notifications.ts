import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /notifications — list my notifications
  fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '20', offset = '0', unreadOnly = 'false' } = request.query as Record<string, string>;

    const conditions = [`user_id = $1`, `deleted_at IS NULL`];
    const params: (string | number)[] = [userId];

    if (unreadOnly === 'true') {
      conditions.push(`is_read = FALSE`);
    }

    const notifications = await query(
      `SELECT id, type, title, body, data, is_read, is_sent, channel, created_at, sent_at, read_at
       FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [count] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    ) as Array<{ count: string }>;

    return {
      data: notifications,
      unreadCount: parseInt(count.count, 10),
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: notifications.length },
    };
  });

  // POST /notifications/:id/read — mark as read
  fastify.post('/notifications/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [notif] = await query(
      'SELECT user_id FROM notifications WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!notif) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Notification introuvable.' } });
    }
    if (notif.user_id !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Non autorisé.' } });
    }

    await query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1', [id]);
    return { status: 'success' };
  });

  // POST /notifications/mark-all-read
  fastify.post('/notifications/mark-all-read', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    await query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE', [userId]);
    return { status: 'success' };
  });

  // POST /notifications/send-test — test sending a notification (admin or for testing)
  fastify.post('/notifications/send', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { userId: targetUserId, type, title, body, channel = 'in_app' } = request.body as {
      userId: string;
      type: string;
      title: string;
      body: string;
      channel?: string;
    };

    // Validate required fields
    if (!targetUserId || !type || !title || !body) {
      return reply.code(400).send({ error: { code: 'MISSING_FIELDS', message: 'Identifiant utilisateur, type, titre et contenu requis.' } });
    }

    const [notif] = await query(
      `INSERT INTO notifications (user_id, type, title, body, channel, is_sent)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [targetUserId, type, title, body, channel]
    );

    // Here you could add Kannel SMS integration
    // if (channel === 'sms') { await sendSMS(...) }

    return reply.code(201).send({ status: 'success', notification: notif });
  });
};
