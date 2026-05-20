import { z } from 'zod';

export const UserRole = z.enum(['patient', 'pharmacist', 'doctor', 'clinic_admin', 'hospital_admin', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  displayName: z.string().optional(),
  role: UserRole,
  preferredLang: z.string().default('fr'),
});

export type User = z.infer<typeof UserSchema>;
