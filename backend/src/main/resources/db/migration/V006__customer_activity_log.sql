-- Journal d'activité Espace Client (actions app + événements auth serveur).
CREATE TABLE IF NOT EXISTS customer_activity_log (
    id              BIGSERIAL PRIMARY KEY,
    event_id        UUID         NOT NULL,
    occurred_at     TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    received_at     TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    source          VARCHAR(20)  NOT NULL,
    category        VARCHAR(40)  NOT NULL,
    event_type      VARCHAR(80)  NOT NULL,
    client_id       BIGINT,
    phone           VARCHAR(30),
    device_id       VARCHAR(64),
    session_id      VARCHAR(64),
    platform        VARCHAR(20),
    app_version     VARCHAR(40),
    screen          VARCHAR(200),
    http_status     INTEGER,
    message         VARCHAR(1000),
    metadata        JSONB,
    ip              VARCHAR(64),
    user_agent      VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_customer_activity_log_event_id
    ON customer_activity_log (event_id);

CREATE INDEX IF NOT EXISTS idx_cal_client_occurred
    ON customer_activity_log (client_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_phone_occurred
    ON customer_activity_log (phone, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_device_occurred
    ON customer_activity_log (device_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_session
    ON customer_activity_log (session_id);

CREATE INDEX IF NOT EXISTS idx_cal_occurred
    ON customer_activity_log (occurred_at);
