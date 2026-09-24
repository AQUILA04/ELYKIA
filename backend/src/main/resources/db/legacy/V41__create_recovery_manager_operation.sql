CREATE TABLE recovery_manager_operation (
    id                        BIGSERIAL PRIMARY KEY,
    recovery_manager_username VARCHAR(255) NOT NULL,
    commercial_username       VARCHAR(255) NOT NULL,
    credit_id                 BIGINT       NOT NULL,
    credit_timeline_id        BIGINT,
    amount_collected          DOUBLE PRECISION NOT NULL,
    is_partial                BOOLEAN      NOT NULL DEFAULT FALSE,
    original_amount_remaining DOUBLE PRECISION NOT NULL,
    operation_date            DATE         NOT NULL,
    reference                 VARCHAR(50)  UNIQUE NOT NULL,
    client_name               VARCHAR(255),
    credit_reference          VARCHAR(255),
    reg_user_id               VARCHAR(50),
    date_reg                  TIMESTAMP,
    mod_user_id               VARCHAR(50),
    date_mod                  TIMESTAMP,
    visibility                VARCHAR(20) DEFAULT 'ENABLED'
);

CREATE INDEX idx_rmo_recovery_manager ON recovery_manager_operation(recovery_manager_username, operation_date);
CREATE INDEX idx_rmo_commercial ON recovery_manager_operation(commercial_username, operation_date);
CREATE INDEX idx_rmo_credit ON recovery_manager_operation(credit_id);

ALTER TABLE daily_commercial_report
    ADD COLUMN IF NOT EXISTS recovery_manager_collections_amount DOUBLE PRECISION DEFAULT 0;
