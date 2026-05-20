import { z } from 'zod';

export const FacilityKind = z.enum(['pharmacys', 'hospitals', 'clinic', 'health_center']);
export type FacilityKind = z.infer<typeof FacilityKind>;

export const CreateFacilitySchema = z.object({
  name: z.string().min(2).max(200),
  kind: FacilityKind,
  address: z.string().min(5),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().regex(/^\+237[0-9]{9}$/),
  licenseNumber: z.string().optional(),
});

export type CreateFacilityInput = z.infer<typeof CreateFacilitySchema>;
