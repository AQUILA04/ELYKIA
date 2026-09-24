CREATE TABLE IF NOT EXISTS tontine_collection_reset_run (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    session_id BIGINT NOT NULL,
    session_year INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    triggered_by VARCHAR(255) NOT NULL,
    collections_count INTEGER DEFAULT 0,
    collections_amount DOUBLE PRECISION DEFAULT 0,
    members_reset_count INTEGER DEFAULT 0,
    pdf_file_count INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS tontine_collection_reset_file (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    run_id BIGINT NOT NULL REFERENCES tontine_collection_reset_run(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    commercial_username VARCHAR(255),
    quarter VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_tontine_collection_reset_file_run ON tontine_collection_reset_file(run_id);
CREATE INDEX IF NOT EXISTS idx_tontine_collection_reset_run_session ON tontine_collection_reset_run(session_id);
