-- Migration 0001: Add patient profile fields
-- Adds gender, blood_type, address, city_id for complete patient registration

ALTER TABLE patient_profiles
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS blood_type VARCHAR(5),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_city ON patient_profiles(city_id);
