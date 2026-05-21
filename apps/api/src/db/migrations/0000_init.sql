-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'pharmacist', 'doctor', 'clinic_admin', 'hospital_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_kyc', 'pending_verification', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'patient',
    status user_status NOT NULL DEFAULT 'pending_verification',
    display_name VARCHAR(100),
    email VARCHAR(255),
    avatar_url TEXT,
    preferred_lang VARCHAR(5) DEFAULT 'fr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- PATIENT PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth TIMESTAMPTZ,
    emergency_contact_phone VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    allergies TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROVIDER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS provider_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    job_title VARCHAR(100),
    license_number VARCHAR(100),
    license_doc_url TEXT,
    kyc_status verification_status NOT NULL DEFAULT 'pending',
    kyc_submitted_at TIMESTAMPTZ,
    kyc_reviewed_by UUID REFERENCES users(id),
    kyc_reviewed_at TIMESTAMPTZ,
    kyc_rejection_reason TEXT,
    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_kyc ON provider_profiles(kyc_status);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45)
);

-- ============================================================
-- CITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),
    region VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Douala',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cities (name, region, timezone) VALUES
    ('Douala', 'Littoral', 'Africa/Douala'),
    ('Yaoundé', 'Centre', 'Africa/Douala'),
    ('Bamenda', 'North-West', 'Africa/Douala')
ON CONFLICT DO NOTHING;
