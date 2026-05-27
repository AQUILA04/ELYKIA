-- Credits
ALTER TABLE credit
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Recoveries (CreditTimeline)
ALTER TABLE credit_timeline
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Recoveries (Legacy)
ALTER TABLE recovery
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Orders
ALTER TABLE orders
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Tontine Members
ALTER TABLE tontine_member
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Tontine Collections
ALTER TABLE tontine_collection
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN confirmed_amount NUMERIC(19, 2) NULL,
ADD COLUMN sync_consent_code TEXT NULL;

-- Tontine Deliveries
ALTER TABLE tontine_delivery
ADD COLUMN operation_consent_code TEXT NULL,
ADD COLUMN sync_consent_code TEXT NULL;
