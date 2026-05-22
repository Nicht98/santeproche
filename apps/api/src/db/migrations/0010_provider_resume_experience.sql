-- Migration 0010: Add resume, experience, and workplace fields to provider_profiles
-- pour permettre aux médecins d'ajouter leur CV, expérience et établissement de travail

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS resume TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS workplace_name TEXT,
  ADD COLUMN IF NOT EXISTS workplace_address TEXT,
  ADD COLUMN IF NOT EXISTS workplace_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS workplace_lng DECIMAL(11, 8);
