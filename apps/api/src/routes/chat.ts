import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';
import { redis } from '../infra/redis.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /conversations
  fastify.get('/conversations', { preHandler: [fastify.authenticate] }, async (request) => {
    const userId = (request.user as { id: string }).id;
    const convs = await query(`
      SELECT c.*, u.display_name as other_party_name
      FROM conversations c
      JOIN users u ON u.id = CASE WHEN c.patient_id = $1 THEN c.provider_id ELSE c.patient_id END
      WHERE c.patient_id = $1 OR c.provider_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST
    `, [userId]);
    return { data: convs };
  });

  // POST /conversations/:id/messages
  fastify.post('/conversations/:id/messages', { preHandler: [fastify.authenticate] }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { content, type = 'text' } = request.body as { content: string; type?: string };
    const userId = (request.user as { id: string }).id;

    const [message] = await query(
      'INSERT INTO messages (conversation_id, sender_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, type, content]
    );

    await query(
      'UPDATE conversations SET last_message_at = NOW(), provider_unread_count = provider_unread_count + 1 WHERE id = $1',
      [id]
    );

    // Publish to Redis for WebSocket broadcast
    await redis.publish(`chat:${id}`, JSON.stringify(message));

    return message;
  });
};
