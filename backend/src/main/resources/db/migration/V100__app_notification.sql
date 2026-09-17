-- Unified in-app notification inbox (payment declarations, customer orders, tontine catch-up)

CREATE TABLE IF NOT EXISTS app_notification (
    id                      BIGSERIAL PRIMARY KEY,
    type                    VARCHAR(50) NOT NULL,
    entity_id               BIGINT,
    entity_reference        VARCHAR(255),
    title                   VARCHAR(255) NOT NULL,
    message                 TEXT,
    client_id               BIGINT,
    client_name             VARCHAR(255),
    target_collector        VARCHAR(255),
    tontine_collector       VARCHAR(255),
    operation_date          DATE,
    amount                  DOUBLE PRECISION,
    link_path               VARCHAR(512),
    link_query              VARCHAR(1024),
    resolved_at             TIMESTAMP,
    REG_USER_ID             VARCHAR(50),
    DATE_REG                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MOD_USER_ID             VARCHAR(50),
    DATE_MOD                TIMESTAMP,
    visibility              VARCHAR(50) NOT NULL DEFAULT 'ENABLED'
);

CREATE INDEX IF NOT EXISTS idx_app_notification_type
    ON app_notification (type);

CREATE INDEX IF NOT EXISTS idx_app_notification_operation_date
    ON app_notification (operation_date DESC);

CREATE INDEX IF NOT EXISTS idx_app_notification_target_collector
    ON app_notification (target_collector);

CREATE INDEX IF NOT EXISTS idx_app_notification_tontine_collector
    ON app_notification (tontine_collector);

CREATE INDEX IF NOT EXISTS idx_app_notification_resolved
    ON app_notification (resolved_at);

CREATE INDEX IF NOT EXISTS idx_app_notification_entity
    ON app_notification (type, entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_app_notification_type_entity_enabled
    ON app_notification (type, entity_id)
    WHERE entity_id IS NOT NULL AND visibility = 'ENABLED' AND resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS app_notification_read (
    notification_id BIGINT NOT NULL REFERENCES app_notification (id) ON DELETE CASCADE,
    username        VARCHAR(255) NOT NULL,
    read_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, username)
);

CREATE INDEX IF NOT EXISTS idx_app_notification_read_user
    ON app_notification_read (username);

-- Backfill tontine catch-up notifications into the unified inbox
INSERT INTO app_notification (
    type, entity_id, entity_reference, title, message,
    client_name, target_collector, tontine_collector,
    operation_date, amount, link_path, link_query,
    REG_USER_ID, DATE_REG, MOD_USER_ID, DATE_MOD, visibility
)
SELECT
    'TONTINE_CATCHUP',
    t.collection_id,
    t.collection_reference,
    'Rattrapage tontine',
    COALESCE(t.client_name, 'Client') || ' · ' || COALESCE(t.commercial_username, ''),
    t.client_name,
    t.commercial_username,
    t.commercial_username,
    t.operation_date,
    t.amount,
    '/report/daily',
    'collector=' || COALESCE(t.commercial_username, '')
        || '&startDate=' || COALESCE(to_char(t.operation_date, 'YYYY-MM-DD'), '')
        || '&endDate=' || COALESCE(to_char(t.operation_date, 'YYYY-MM-DD'), ''),
    t.REG_USER_ID,
    t.DATE_REG,
    t.MOD_USER_ID,
    t.DATE_MOD,
    t.visibility
FROM tontine_catchup_notification t
WHERE NOT EXISTS (
    SELECT 1 FROM app_notification a
    WHERE a.type = 'TONTINE_CATCHUP'
      AND a.entity_id IS NOT DISTINCT FROM t.collection_id
);

-- Backfill read receipts (best-effort match by collection entity)
INSERT INTO app_notification_read (notification_id, username, read_at)
SELECT a.id, r.username, r.read_at
FROM tontine_catchup_notification_read r
JOIN tontine_catchup_notification t ON t.id = r.notification_id
JOIN app_notification a
  ON a.type = 'TONTINE_CATCHUP'
 AND a.entity_id IS NOT DISTINCT FROM t.collection_id
WHERE NOT EXISTS (
    SELECT 1 FROM app_notification_read ar
    WHERE ar.notification_id = a.id AND ar.username = r.username
);
