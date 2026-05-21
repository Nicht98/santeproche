import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  nameFr: varchar('name_fr', { length: 100 }),
  region: varchar('region', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('Africa/Douala'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
