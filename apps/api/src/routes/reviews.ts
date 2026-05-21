import { FastifyPluginAsync } from 'fastify';
import { query } from '../db/index.js';

export const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /reviews — create a review (after completed appointment)
  fastify.post('/reviews', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { providerId, facilityId, appointmentId, rating, comment } = request.body as {
      providerId?: string;
      facilityId?: string;
      appointmentId?: string;
      rating: number;
      comment?: string;
    };
    const reviewerId = request.user.id;

    if (!providerId && !facilityId) {
      return reply.code(400).send({ error: { code: 'MISSING_TARGET', message: 'Either providerId or facilityId is required' } });
    }
    if (rating < 1 || rating > 5) {
      return reply.code(400).send({ error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' } });
    }

    // Optional: verify completed appointment if appointmentId provided
    let isVerified = false;
    if (appointmentId) {
      const [appt] = await query(
        'SELECT patient_id, status FROM appointments WHERE id = $1 LIMIT 1',
        [appointmentId]
      );
      if (!appt || appt.patient_id !== reviewerId) {
        return reply.code(403).send({ error: { code: 'UNAUTHORIZED', message: 'You can only review your own appointments' } });
      }
      if (appt.status !== 'completed') {
        return reply.code(400).send({ error: { code: 'APPOINTMENT_NOT_COMPLETED', message: 'Can only review completed appointments' } });
      }
      isVerified = true;
    }

    const [review] = await query(
      `INSERT INTO reviews (reviewer_id, provider_id, facility_id, appointment_id, rating, comment, is_verified_visit)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [reviewerId, providerId || null, facilityId || null, appointmentId || null, rating, comment || null, isVerified]
    );

    return reply.code(201).send({ status: 'success', review });
  });

  // GET /reviews/provider/:id — get reviews for a provider
  fastify.get('/reviews/provider/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const reviews = await query(
      `SELECT r.*, u.display_name as reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.provider_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [agg] = await query(
      `SELECT COUNT(*) as total, ROUND(AVG(rating), 1) as average
       FROM reviews WHERE provider_id = $1 AND deleted_at IS NULL`,
      [id]
    ) as Array<{ total: string; average: string }>;

    return {
      data: reviews,
      summary: { total: parseInt(agg.total, 10), average: agg.average ? parseFloat(agg.average) : null },
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: reviews.length },
    };
  });

  // GET /reviews/facility/:id — get reviews for a facility
  fastify.get('/reviews/facility/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    const { limit = '20', offset = '0' } = request.query as Record<string, string>;

    const reviews = await query(
      `SELECT r.*, u.display_name as reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.facility_id = $1 AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [agg] = await query(
      `SELECT COUNT(*) as total, ROUND(AVG(rating), 1) as average
       FROM reviews WHERE facility_id = $1 AND deleted_at IS NULL`,
      [id]
    ) as Array<{ total: string; average: string }>;

    return {
      data: reviews,
      summary: { total: parseInt(agg.total, 10), average: agg.average ? parseFloat(agg.average) : null },
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10), count: reviews.length },
    };
  });

  // DELETE /reviews/:id — soft delete own review
  fastify.delete('/reviews/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const [review] = await query(
      'SELECT reviewer_id FROM reviews WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
      [id]
    );

    if (!review) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Review not found' } });
    }
    if (review.reviewer_id !== userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'You can only delete your own reviews' } });
    }

    await query('UPDATE reviews SET deleted_at = NOW() WHERE id = $1', [id]);
    return { status: 'success', message: 'Review deleted' };
  });
};
