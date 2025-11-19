import { pgTable, text, integer, serial, real, timestamp } from 'drizzle-orm/pg-core';

// Users table (stores Auth0 user ID and basic info)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  auth0Id: text('auth0_id').notNull().unique(),
  notificationToken: text('notification_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Personal info table
export const personalInfo = pgTable('personal_info', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  iban: text('iban').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Addresses table
export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  streetAddress: text('street_address').notNull(),
  building: text('building'),
  apartment: text('apartment'),
  zip: text('zip').notNull(),
  city: text('city').notNull(),
  stateRegion: text('state_region').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Receipts table
export const receipts = pgTable('receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  qrData: text('qr_data').notNull(),
  amount: real('amount'),
  merchant: text('merchant'),
  vat: text('vat'),
  scannedAt: timestamp('scanned_at').notNull().defaultNow(),
  createdAt: timestamp('created_at'),
});

// Wins table
export const wins = pgTable('wins', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  wonAt: timestamp('won_at').notNull().defaultNow(),
});
