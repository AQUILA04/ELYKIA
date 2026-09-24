CREATE TABLE IF NOT EXISTS client_collector_history (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    collector_type VARCHAR(20) NOT NULL,
    old_collector VARCHAR(255),
    new_collector VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    change_date TIMESTAMP NOT NULL,
    created_date TIMESTAMP,
    last_modified_date TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    state VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_client_collector_history_client_changed
    ON client_collector_history (client_id, change_date DESC);
