-- Migration 0004: Fix provider_profiles.facility_id foreign key
-- The 0000_init.sql incorrectly referenced users(id) instead of facilities(id).
-- Since 0002 migration used CREATE TABLE IF NOT EXISTS, the bad FK persisted.

-- Drop the incorrect FK constraint (if it exists)
ALTER TABLE provider_profiles
  DROP CONSTRAINT IF EXISTS provider_profiles_facility_id_fkey;

-- Recreate the FK pointing to facilities(id)
ALTER TABLE provider_profiles
  ADD CONSTRAINT provider_profiles_facility_id_fkey
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL;
