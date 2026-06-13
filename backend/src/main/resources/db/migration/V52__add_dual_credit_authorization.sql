ALTER TABLE credit
    ADD COLUMN IF NOT EXISTS credit_purpose VARCHAR(20) DEFAULT 'PERSONAL' NOT NULL;

UPDATE credit SET credit_purpose = 'PERSONAL' WHERE credit_purpose IS NULL;

ALTER TABLE client
    ADD COLUMN IF NOT EXISTS business_credit_in_progress BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS business_credit_authorized BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS business_credit_authorized_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS business_credit_authorized_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS business_credit_authorization_event (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP NOT NULL,
    created_date TIMESTAMP,
    last_modified_date TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    state VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_bca_event_client_performed
    ON business_credit_authorization_event (client_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_client_purpose_status
    ON credit (client_id, credit_purpose, status, state);
