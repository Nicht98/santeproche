import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';
import { redis } from '../infra/redis.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /conversations — list my conversations
  fastify.get('/conversations', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const convs = await query(`
      SELECT c.id, c.patient_id as "patientId", c.provider_id as "providerId",
        c.facility_id as "facilityId", c.subject, c.status,
        c.patient_unread_count as "patientUnreadCount",
        c.provider_unread_count as "providerUnreadCount",
        c.last_message_at as "lastMessageAt",
        c.created_at as "createdAt", c.updated_at as "updatedAt",
        CASE WHEN c.patient_id = $1 THEN u.display_name ELSE p.display_name END as "otherPartyName",
        CASE WHEN c.patient_id = $1 THEN u.phone ELSE p.phone END as "otherPartyPhone"
      FROM conversations c
      JOIN users u ON u.id = c.provider_id
      JOIN users p ON p.id = c.patient_id
      WHERE c.patient_id = $1 OR c.provider_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit, 10), parseInt(offset, 10)]);

    return { data: convs, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: convs.length } };
  });

  // POST /conversations — start a new conversation
  fastify.post('/conversations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { providerId, facilityId, subject } = request.body as {
      providerId: string;
      facilityId?: string;
      subject?: string;
    };
    const patientId = request.user.id;

    // Prevent starting conversation with self
    if (providerId === patientId) {
      return reply.code(400).send({ error: { code: 'SELF_CONVERSATION', message: "Vous ne pouvez pas démarrer une conversation avec vous-même." } });
    }

    const [existing] = await query(
      `SELECT id FROM conversations WHERE patient_id = $1 AND provider_id = $2 LIMIT 1`,
      [patientId, providerId]
    );

    if (existing) {
      return reply.code(409).send({ error: { code: 'CONVERSATION_EXISTS', message: "Cette conversation existe déjà.", conversationId: existing.id } });
    }

    const [conv] = await query(
      `INSERT INTO conversations (patient_id, provider_id, facility_id, subject)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patientId, providerId, facilityId || null, subject || null]
    );

    return reply.code(201).send({ status: 'success', conversation: conv });
  });

  // GET /conversations/:id — get conversation details
  fastify.get('/conversations/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [conv] = await query(
      `SELECT c.id, c.patient_id as "patientId", c.provider_id as "providerId",
        c.facility_id as "facilityId", c.subject, c.status,
        c.patient_unread_count as "patientUnreadCount",
        c.provider_unread_count as "providerUnreadCount",
        c.last_message_at as "lastMessageAt",
        c.created_at as "createdAt", c.updated_at as "updatedAt",
        CASE WHEN c.patient_id = $1 THEN u.display_name ELSE p.display_name END as "otherPartyName"
      FROM conversations c
      JOIN users u ON u.id = c.provider_id
      JOIN users p ON p.id = c.patient_id
      WHERE c.id = $1 AND (c.patient_id = $2 OR c.provider_id = $2)
      LIMIT 1`,
      [userId, id]
    );

    if (!conv) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: "Conversation introuvable." } });
    }

    return { data: conv };
  });

  // GET /conversations/:id/messages — list messages in a conversation
  fastify.get('/conversations/:id/messages', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;
    const { limit = '50', offset = '0' } = request.query as Record<string, string>;

    // Verify access
    const [conv] = await query(
      'SELECT patient_id, provider_id FROM conversations WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!conv || (conv.patient_id !== userId && conv.provider_id !== userId)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: "Vous ne pouvez pas voir cette conversation." } });
    }

    const messages = await query(
      `SELECT m.id, m.conversation_id as "conversationId", m.sender_id as "senderId",
         m.type, m.content, m.is_edited as "isEdited",
         m.created_at as "createdAt", m.updated_at as "updatedAt",
         u.display_name as "senderName", u.role as "senderRole"
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    // Mark messages as read for this user
    const isPatient = conv.patient_id === userId;
    await query(
      `UPDATE conversations SET ${isPatient ? 'patient_unread_count' : 'provider_unread_count'} = 0 WHERE id = $1`,
      [id]
    );

    return { data: messages.reverse(), pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: messages.length } };
  });

  // POST /conversations/:id/messages — send a message
  fastify.post('/conversations/:id/messages', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content, type = 'text' } = request.body as { content: string; type?: string };
    const userId = request.user.id;

    // Verify access
    const [conv] = await query(
      'SELECT patient_id, provider_id FROM conversations WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!conv || (conv.patient_id !== userId && conv.provider_id !== userId)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: "Vous ne pouvez pas envoyer de messages dans cette conversation." } });
    }

    const [message] = await query(
      `INSERT INTO messages (conversation_id, sender_id, type, content) VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id as "conversationId", sender_id as "senderId", type, content,
                 is_edited as "isEdited", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, userId, type, content]
    );

    // Update last message time and unread count
    const isPatient = conv.patient_id === userId;
    await query(
      `UPDATE conversations SET last_message_at = NOW(),
       ${isPatient ? 'provider_unread_count' : 'patient_unread_count'} = ${isPatient ? 'provider_unread_count' : 'patient_unread_count'} + 1,
       updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Publish to Redis for WebSocket broadcast
    await redis.publish(`chat:${id}`, JSON.stringify({ ...message, senderId: userId }));

    return reply.code(201).send({ status: 'success', message });
  });

  // GET /conversations/unread-count — total unread messages for current user
  fastify.get('/conversations/unread-count', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;

    const [result] = await query(
      `SELECT COALESCE(SUM(patient_unread_count), 0) as patient_unread,
              COALESCE(SUM(provider_unread_count), 0) as provider_unread
       FROM conversations WHERE patient_id = $1 OR provider_id = $1`,
      [userId]
    ) as Array<{ patient_unread: string; provider_unread: string }>;

    return {
      totalUnread: parseInt(result.patient_unread, 10) + parseInt(result.provider_unread, 10),
      patientUnread: parseInt(result.patient_unread, 10),
      providerUnread: parseInt(result.provider_unread, 10),
    };
  });
};
