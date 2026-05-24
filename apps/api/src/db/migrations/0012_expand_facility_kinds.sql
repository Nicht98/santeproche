-- Migration 0012: Expand facility_kind enum with additional healthcare establishment types

DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'dispensary'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'maternity'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'dental'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'optical'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'mental_health'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN  ALTER TYPE facility_kind ADD VALUE 'vaccination'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
