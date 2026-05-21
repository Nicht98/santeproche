-- Migration 0004: Seed a test provider for end-to-end booking tests

-- Test provider: Dr. Amadou Biya at Hopital Général de Douala
INSERT INTO users (id, phone, phone_verified, role, status, display_name, email, preferred_lang, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '+237999999999',
  true,
  'doctor',
  'active',
  'Dr. Amadou Biya',
  'dr.biya@hopitaldouala.cm',
  'fr',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Provider profile (linked to Hopital Général de Douala)
INSERT INTO provider_profiles (user_id, facility_id, job_title, license_number, license_doc_url, kyc_status, is_primary_contact, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '550e8400-e29b-41d4-a716-446655440002',
  'Médecin Généraliste',
  'CMP-12345-DLA',
  'https://example.com/license.pdf',
  'verified',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- Schedule: Monday-Friday 08:00-17:00, Saturday 08:00-13:00
INSERT INTO provider_schedules (provider_id, facility_id, day_of_week, start_time, end_time, slot_duration_min, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'monday',    '08:00', '17:00', 30, true),
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'tuesday',   '08:00', '17:00', 30, true),
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'wednesday', '08:00', '17:00', 30, true),
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'thursday',  '08:00', '17:00', 30, true),
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'friday',    '08:00', '17:00', 30, true),
  ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'saturday',  '08:00', '13:00', 30, true)
ON CONFLICT DO NOTHING;
