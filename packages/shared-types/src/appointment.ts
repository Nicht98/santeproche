import { z } from 'zod';

export const AppointmentStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled_by_patient', 'cancelled_by_provider', 'no_show']);

export const CreateAppointmentSchema = z.object({
  providerId: z.string().uuid(),
  facilityId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().min(15).max(240).default(30),
  reason: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
