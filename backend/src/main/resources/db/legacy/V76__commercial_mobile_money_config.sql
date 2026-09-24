-- Per-commercial mobile money numbers (Mixx by YAS / Moov Money) for customer-space manual payments

CREATE TABLE IF NOT EXISTS commercial_mobile_money_config (
    id BIGSERIAL PRIMARY KEY,
    commercial_username VARCHAR(50) NOT NULL,
    mixx_number VARCHAR(20),
    moov_number VARCHAR(20),
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'System',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    CONSTRAINT uq_commercial_mobile_money_username UNIQUE (commercial_username)
);

CREATE INDEX IF NOT EXISTS idx_cmm_config_username ON commercial_mobile_money_config (commercial_username);
