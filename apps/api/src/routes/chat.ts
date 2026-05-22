import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';
import { redis } from '../infra/redis.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /conversations — list my conversations
  fastify.get('/conversations', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = request.user.id;
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const convs = await query(`
      SELECT c.*,
        CASE WHEN c.patient_id = $1 THEN u.display_name ELSE p.display_name END as other_party_name,
        CASE WHEN c.patient_id = $1 THEN u.phone ELSE p.phone END as other_party_phone,
        m.content as last_message,
        m.created_at as last_message_created_at
      FROM conversations c
      JOIN users u ON u.id = c.provider_id
      JOIN users p ON p.id = c.patient_id
      LEFT JOIN LATERAL (
        SELECT content, created_at FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) m ON true
      WHERE c.patient_id = $1 OR c.provider_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit, 10), parseInt(offset, 10)]);

    // Normalize to camelCase for the frontend
    const data = convs.map((conv: any) => ({
      id: conv.id,
      patientId: conv.patient_id,
      providerId: conv.provider_id,
      facilityId: conv.facility_id,
      subject: conv.subject,
      status: conv.status,
      patientUnreadCount: conv.patient_unread_count,
      providerUnreadCount: conv.provider_unread_count,
      lastMessageAt: conv.last_message_at,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      otherPartyName: conv.other_party_name,
      otherPartyPhone: conv.other_party_phone,
      lastMessage: conv.last_message,
      lastMessageCreatedAt: conv.last_message_created_at,
    }));

    return { data, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: data.length } };
  });

  // POST /conversations — start a new conversation
  fastify.post('/conversations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as { providerId?: string; receiverId?: string; facilityId?: string; subject?: string };
    const receiverId = body.providerId ?? body.receiverId;
    if (!receiverId) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'providerId or receiverId required' } });
    }
    const userId = request.user.id;
    const userRole = request.user.role as string;

    // Prevent starting conversation with self
    if (receiverId === userId) {
      return reply.code(400).send({ error: { code: 'SELF_CONVERSATION', message: 'Cannot start a conversation with yourself' } });
    }

    // Determine patient / provider assignment based on roles
    const [receiver] = await query(
      'SELECT id, role FROM users WHERE id = $1 LIMIT 1',
      [receiverId]
    ) as Array<{ id: string; role: string }>;
    if (!receiver) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Receiver not found' } });
    }

    const PROVIDER_ROLES = new Set(['doctor', 'pharmacist', 'clinic_admin', 'hospital_admin', 'admin']);
    const userIsProvider = PROVIDER_ROLES.has(userRole);
    const receiverIsProvider = PROVIDER_ROLES.has(receiver.role);

    // Schema requires a patient_id (NOT NULL), so one side must be a patient
    let patientId: string, providerId: string | null;
    if (!userIsProvider && receiverIsProvider) {
      // Patient → Provider
      patientId = userId;
      providerId = receiverId;
    } else if (userIsProvider && !receiverIsProvider) {
      // Provider → Patient
      patientId = receiverId;
      providerId = userId;
    } else {
      return reply.code(400).send({ error: { code: 'INVALID_PARTICIPANTS', message: 'Conversations require one patient and one provider' } });
    }

    const [existing] = await query(
      `SELECT id FROM conversations WHERE patient_id = $1 AND provider_id = $2 LIMIT 1`,
      [patientId, providerId]
    );

    if (existing) {
      return reply.code(409).send({ error: { code: 'CONVERSATION_EXISTS', message: 'Conversation already exists', conversationId: existing.id } });
    }

    const [conv] = await query(
      `INSERT INTO conversations (patient_id, provider_id, facility_id, subject)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patientId, providerId, body.facilityId || null, body.subject || null]
    );

    return reply.code(201).send({
      status: 'success',
      conversation: {
        id: conv.id,
        patientId: conv.patient_id,
        providerId: conv.provider_id,
        facilityId: conv.facility_id,
        subject: conv.subject,
        status: conv.status,
        createdAt: conv.created_at,
      }
    });
  });

  // GET /conversations/:id — get conversation details
  fastify.get('/conversations/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [conv] = await query(
      `SELECT c.*,
        CASE WHEN c.patient_id = $1 THEN u.display_name ELSE p.display_name END as other_party_name
      FROM conversations c
      JOIN users u ON u.id = c.provider_id
      JOIN users p ON p.id = c.patient_id
      WHERE c.id = $1 AND (c.patient_id = $2 OR c.provider_id = $2)
      LIMIT 1`,
      [userId, id]
    );

    if (!conv) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
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
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not authorized to view this conversation' } });
    }

    const rows = await query(
      `SELECT m.*, u.display_name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    // Normalize to camelCase
    const data = rows.map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      type: m.type,
      content: m.content,
      isEdited: m.is_edited,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    // Mark messages as read for this user
    const isPatient = conv.patient_id === userId;
    await query(
      `UPDATE conversations SET ${isPatient ? 'patient_unread_count' : 'provider_unread_count'} = 0 WHERE id = $1`,
      [id]
    );

    return { data, pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: data.length } };
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
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not authorized to send messages in this conversation' } });
    }

    const [message] = await query(
      'INSERT INTO messages (conversation_id, sender_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *',
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

    return reply.code(201).send({ status: 'success', data: message });
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
