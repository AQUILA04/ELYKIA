ALTER TABLE tontine_collection
    ADD COLUMN IF NOT EXISTS advance_to_next_month BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS contribution_month DATE;

UPDATE tontine_collection
SET contribution_month = date_trunc('month', collection_date)::date
WHERE contribution_month IS NULL;

CREATE TABLE IF NOT EXISTS tontine_allocation_migration_run (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    from_version VARCHAR(10) NOT NULL,
    to_version VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    triggered_by VARCHAR(255) NOT NULL,
    total_members INTEGER NOT NULL DEFAULT 0,
    processed_members INTEGER NOT NULL DEFAULT 0,
    failed_members INTEGER NOT NULL DEFAULT 0,
    last_processed_member_id BIGINT NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS tontine_member_allocation_snapshot (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES tontine_allocation_migration_run(id),
    member_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    society_share DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_contribution DOUBLE PRECISION NOT NULL DEFAULT 0,
    available_contribution DOUBLE PRECISION NOT NULL DEFAULT 0,
    validated_months INTEGER NOT NULL DEFAULT 0,
    current_month_days INTEGER NOT NULL DEFAULT 0,
    collections_society_share JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT uq_tontine_member_allocation_snapshot_run_member UNIQUE (run_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_tontine_allocation_migration_run_status
    ON tontine_allocation_migration_run(status);

CREATE INDEX IF NOT EXISTS idx_tontine_member_allocation_snapshot_run
    ON tontine_member_allocation_snapshot(run_id);
