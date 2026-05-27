-- Migration 0012: Expand facility_kind enum with missing healthcare establishment types
-- These kinds are already referenced in the frontend but were missing from the DB schema.

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'dispensary';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'maternity';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'dental';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'optical';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'mental_health';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE facility_kind ADD VALUE IF NOT EXISTS 'vaccination';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
