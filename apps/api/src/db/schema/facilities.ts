import { pgTable, uuid, varchar, text, boolean, timestamp, numeric, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { users } from './users.js';

export const facilityKindEnum = pgEnum('facility_kind', [
  'pharmacy', 'hospital', 'clinic', 'laboratory', 'health_center', 'other'
]);

export const facilityStatusEnum = pgEnum('facility_status', [
  'active', 'closed', 'temporarily_closed', 'pending_verification'
]);

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]);

export const facilities = pgTable('facilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  kind: facilityKindEnum('kind').notNull().default('pharmacy'),
  status: facilityStatusEnum('status').notNull().default('pending_verification'),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cityId: integer('city_id').references(() => cities.id, { onDelete: 'set null' }),
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lng: numeric('lng', { precision: 10, scale: 7 }),
  openingHours: jsonb('opening_hours'), // {monday: {open:"08:00",close:"18:00"}}
  is24h: boolean('is_24h').notNull().default(false),
  hasEmergency: boolean('has_emergency').notNull().default(false),
  licenseNumber: varchar('license_number', { length: 100 }),
  licenseVerified: boolean('license_verified').notNull().default(false),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const providerSchedules = pgTable('provider_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(),
  slotDurationMin: integer('slot_duration_min').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  reason: text('reason'),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
});
