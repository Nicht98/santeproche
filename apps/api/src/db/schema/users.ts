import { pgTable, uuid, varchar, boolean, timestamp, pgEnum, text, integer } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';

export const userRoleEnum = pgEnum('user_role', [
  'patient', 'pharmacist', 'doctor', 'clinic_admin', 'hospital_admin', 'admin'
]);

export const userStatusEnum = pgEnum('user_status', [
  'active', 'suspended', 'pending_kyc', 'pending_verification', 'rejected'
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: userRoleEnum('role').notNull().default('patient'),
  status: userStatusEnum('status').notNull().default('pending_verification'),
  displayName: varchar('display_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  preferredLang: varchar('preferred_lang', { length: 5 }).default('fr'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const patientProfiles = pgTable('patient_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  dateOfBirth: timestamp('date_of_birth', { withTimezone: true }),
  gender: varchar('gender', { length: 20 }),
  bloodType: varchar('blood_type', { length: 5 }),
  address: text('address'),
  cityId: integer('city_id').references(() => cities.id, { onDelete: 'set null' }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 100 }),
  allergies: text('allergies').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified', 'pending', 'verified', 'rejected'
]);

export const providerProfiles = pgTable('provider_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id'),
  jobTitle: varchar('job_title', { length: 100 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  licenseDocUrl: text('license_doc_url'),
  resume: text('resume'),
  experience: text('experience'),
  workplaceName: text('workplace_name'),
  workplaceAddress: text('workplace_address'),
  workplaceLat: text('workplace_lat'),
  workplaceLng: text('workplace_lng'),
  kycStatus: verificationStatusEnum('kyc_status').notNull().default('pending'),
  kycSubmittedAt: timestamp('kyc_submitted_at', { withTimezone: true }),
  kycReviewedBy: uuid('kyc_reviewed_by').references(() => users.id),
  kycReviewedAt: timestamp('kyc_reviewed_at', { withTimezone: true }),
  kycRejectionReason: text('kyc_rejection_reason'),
  isPrimaryContact: boolean('is_primary_contact').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
