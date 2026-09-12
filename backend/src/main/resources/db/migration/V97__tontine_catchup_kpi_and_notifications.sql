-- Catch-up KPIs on daily report (capture / saisie day) + notification inbox

ALTER TABLE daily_commercial_report
    ADD COLUMN IF NOT EXISTS tontine_catchup_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE daily_commercial_report
    ADD COLUMN IF NOT EXISTS tontine_catchup_amount DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS tontine_catchup_notification (
    id                      BIGSERIAL PRIMARY KEY,
    commercial_username     VARCHAR(255) NOT NULL,
    operation_date          DATE NOT NULL,
    capture_date            DATE NOT NULL,
    amount                  DOUBLE PRECISION NOT NULL,
    collection_id           BIGINT,
    collection_reference    VARCHAR(255),
    client_name             VARCHAR(255),
    REG_USER_ID             VARCHAR(50),
    DATE_REG                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MOD_USER_ID             VARCHAR(50),
    DATE_MOD                TIMESTAMP,
    visibility              VARCHAR(50) NOT NULL DEFAULT 'ENABLED',
    CONSTRAINT uk_tontine_catchup_notification_collection UNIQUE (collection_id)
);

CREATE INDEX IF NOT EXISTS idx_tontine_catchup_notif_capture
    ON tontine_catchup_notification (capture_date DESC);

CREATE INDEX IF NOT EXISTS idx_tontine_catchup_notif_operation
    ON tontine_catchup_notification (operation_date DESC);

CREATE INDEX IF NOT EXISTS idx_tontine_catchup_notif_commercial
    ON tontine_catchup_notification (commercial_username);

CREATE TABLE IF NOT EXISTS tontine_catchup_notification_read (
    notification_id BIGINT NOT NULL REFERENCES tontine_catchup_notification (id) ON DELETE CASCADE,
    username        VARCHAR(255) NOT NULL,
    read_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, username)
);

CREATE INDEX IF NOT EXISTS idx_tontine_catchup_notif_read_user
    ON tontine_catchup_notification_read (username);
