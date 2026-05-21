-- Migration: add reschedule tracking to appointments
-- Created: May 2026

ALTER TABLE IF EXISTS appointments
    ADD COLUMN IF NOT EXISTS rescheduled_from  timestamp with time zone,
    ADD COLUMN IF NOT EXISTS rescheduled_at   timestamp with time zone;

-- Index to find recently rescheduled appointments
CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_at
    ON appointments(rescheduled_at)
    WHERE rescheduled_at IS NOT NULL;
