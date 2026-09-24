CREATE TABLE IF NOT EXISTS monthly_report_run (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_revenue_amount DOUBLE PRECISION DEFAULT 0,
    total_purchase_amount DOUBLE PRECISION DEFAULT 0,
    total_margin_amount DOUBLE PRECISION DEFAULT 0,
    current_chunk_cursor VARCHAR(255),
    total_commercial_count INTEGER DEFAULT 0,
    completed_commercial_count INTEGER DEFAULT 0,
    error_message TEXT,
    CONSTRAINT uk_monthly_report_run_month UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS monthly_report_file (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    run_id BIGINT NOT NULL REFERENCES monthly_report_run(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    commercial_username VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS monthly_report_snapshot (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    run_id BIGINT NOT NULL REFERENCES monthly_report_run(id) ON DELETE CASCADE,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_report_outbox_entry (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    run_id BIGINT NOT NULL REFERENCES monthly_report_run(id) ON DELETE CASCADE,
    file_type VARCHAR(30) NOT NULL,
    commercial_username VARCHAR(255),
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    local_file_path VARCHAR(1000) NOT NULL,
    status VARCHAR(30) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    error_message TEXT
);

ALTER TABLE commercial_stock_movement
    ADD COLUMN IF NOT EXISTS unit_purchase_price DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS unit_sale_price DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS margin_amount DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS source_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_monthly_report_outbox_status ON monthly_report_outbox_entry(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_monthly_report_file_run ON monthly_report_file(run_id);

CREATE TABLE IF NOT EXISTS shedlock(
    name VARCHAR(64) PRIMARY KEY,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL
);
