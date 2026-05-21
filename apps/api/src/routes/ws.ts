import { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';
import { redis } from '../infra/redis.js';

export const wsRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      connection.socket.close(4001, 'Missing token');
      return;
    }

    // Verify token synchronously
    let userId: string;
    try {
      const decoded = fastify.jwt.verify(token) as { id: string };
      userId = decoded.id;
    } catch {
      connection.socket.close(4001, 'Invalid token');
      return;
    }

    const socket = connection.socket;
    let subscriber: ReturnType<typeof redis.duplicate> | null = null;

    // Create a Redis subscriber for this connection
    try {
      subscriber = redis.duplicate();

      async function subscribeConversations() {
        if (!subscriber) return;
        const { query: dbQuery } = await import('../db/index.js');
        const convs = await dbQuery(
          'SELECT id FROM conversations WHERE patient_id = $1 OR provider_id = $1',
          [userId]
        );
        for (const conv of convs) {
          await subscriber.subscribe(`chat:${conv.id}`);
        }
        return convs.length;
      }

      // Listen to messages
      subscriber.on('message', (channel: string, message: string) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ channel, data: JSON.parse(message) }));
        }
      });

      subscriber.on('error', (err) => {
        fastify.log.error({ msg: 'Redis sub error', err: err.message });
        if (socket.readyState === 1) {
          socket.close(1011, 'Redis subscriber error');
        }
      });

      subscriber.connect().then(() => {
        subscribeConversations().then((count) => {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({ type: 'connected', conversations: count }));
          }
        }).catch((err) => {
          fastify.log.error({ msg: 'Subscribe error', err: err.message });
          if (socket.readyState === 1) socket.close(1011, 'Subscribe failed');
        });
      }).catch((err) => {
        fastify.log.error({ msg: 'Redis connect error', err: err.message });
        if (socket.readyState === 1) socket.close(1011, 'Redis connect failed');
      });

      // Clean up on disconnect
      socket.on('close', () => {
        if (subscriber) {
          subscriber.quit().catch(() => {});
          subscriber = null;
        }
      });

      // Handle client messages
      socket.on('message', async (data: string) => {
        try {
          const msg = JSON.parse(data as string);
          if (msg?.subscribe === 'conversation' && msg?.conversationId && subscriber) {
            const { query: dbQuery } = await import('../db/index.js');
            const [conv] = await dbQuery(
              'SELECT id FROM conversations WHERE id = $1 AND (patient_id = $2 OR provider_id = $2) LIMIT 1',
              [msg.conversationId, userId]
            );
            if (conv) {
              await subscriber.subscribe(`chat:${msg.conversationId}`);
              if (socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'subscribed', conversationId: msg.conversationId }));
              }
            } else {
              if (socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'error', message: 'Not authorized for this conversation' }));
              }
            }
          } else if (msg?.ping) {
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({ type: 'pong' }));
            }
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
      });

    } catch (err) {
      fastify.log.error({ msg: 'WS setup error', err: (err as Error).message });
      socket.close(1011, 'Setup error');
    }
  });
};
