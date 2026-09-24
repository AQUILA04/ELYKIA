-- Mobile device authorization per user account

ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_device_restriction_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_authorized_device (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    device_label VARCHAR(255),
    platform VARCHAR(32),
    model VARCHAR(128),
    app_version VARCHAR(32),
    registered_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_by VARCHAR(80) NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT fk_user_authorized_device_user FOREIGN KEY (user_id) REFERENCES users (useid) ON DELETE CASCADE,
    CONSTRAINT uk_user_authorized_device_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_authorized_device_user_id ON user_authorized_device (user_id);
CREATE INDEX IF NOT EXISTS idx_user_authorized_device_user_active ON user_authorized_device (user_id, active);
