-- Credits
ALTER TABLE credit
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Recoveries (CreditTimeline)
ALTER TABLE credit_timeline
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Recoveries (Legacy)
ALTER TABLE recovery
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Tontine Members
ALTER TABLE tontine_member
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Tontine Collections
ALTER TABLE tontine_collection
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;

-- Tontine Deliveries
ALTER TABLE tontine_delivery
ADD COLUMN IF NOT EXISTS operation_consent_code TEXT NULL,
ADD COLUMN IF NOT EXISTS sync_consent_code TEXT NULL;
