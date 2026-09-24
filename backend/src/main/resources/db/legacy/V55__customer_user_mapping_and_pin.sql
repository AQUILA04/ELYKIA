-- Espace Client: PIN flag on user accounts + client-user mapping (core orchestration)

ALTER TABLE uacc ADD COLUMN IF NOT EXISTS pin_configured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS customer_user_mapping (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'System',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    client_id BIGINT NOT NULL,
    username VARCHAR(20) NOT NULL,
    CONSTRAINT uk_customer_user_mapping_client_id UNIQUE (client_id),
    CONSTRAINT uk_customer_user_mapping_username UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_customer_user_mapping_username ON customer_user_mapping (username);
