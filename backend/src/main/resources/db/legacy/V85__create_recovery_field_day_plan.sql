-- Plan journalier terrain du chef de recouvrement (périmètre offline 1–3 commerciaux)

CREATE TABLE IF NOT EXISTS recovery_field_day_plan (
    id                          BIGSERIAL PRIMARY KEY,
    recovery_manager_username   VARCHAR(255) NOT NULL,
    plan_date                   DATE         NOT NULL,
    status                      VARCHAR(32)  NOT NULL,
    commercial_usernames_json   TEXT         NOT NULL,
    quarters_json               TEXT,
    created_date                TIMESTAMP,
    last_modified_date          TIMESTAMP,
    created_by                  VARCHAR(255),
    last_modified_by            VARCHAR(255),
    state                       VARCHAR(50)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_rm_field_plan_active_day
    ON recovery_field_day_plan (recovery_manager_username, plan_date)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_rm_field_plan_rm_date
    ON recovery_field_day_plan (recovery_manager_username, plan_date DESC);
