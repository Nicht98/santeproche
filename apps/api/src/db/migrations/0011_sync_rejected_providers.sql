-- Migration 0011: Sync user.status to 'rejected' for providers whose kycStatus is already 'rejected'
-- These accounts were never blocked before because the code only set kycStatus, not user.status.

UPDATE users
SET status = 'rejected',
    updated_at = CURRENT_TIMESTAMP
FROM provider_profiles
WHERE users.id = provider_profiles.user_id
  AND provider_profiles.kyc_status = 'rejected'
  AND users.status != 'rejected';
