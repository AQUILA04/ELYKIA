CREATE TABLE IF NOT EXISTS tontine_member_field_control (
    id BIGSERIAL PRIMARY KEY,
    tontine_member_id BIGINT NOT NULL,
    notebook_total_amount DOUBLE PRECISION NOT NULL,
    system_total_amount DOUBLE PRECISION NOT NULL,
    difference_amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) NOT NULL,
    observed_at TIMESTAMP NOT NULL,
    observed_by VARCHAR(255) NOT NULL,
    note VARCHAR(1000),
    created_date TIMESTAMP,
    last_modified_date TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    state VARCHAR(50)
);

ALTER TABLE tontine_member_field_control
    ADD CONSTRAINT fk_tm_field_control_member
        FOREIGN KEY (tontine_member_id) REFERENCES tontine_member(id);

CREATE INDEX IF NOT EXISTS idx_tm_field_control_member_observed
    ON tontine_member_field_control (tontine_member_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS tontine_member_field_control_line (
    id BIGSERIAL PRIMARY KEY,
    field_control_id BIGINT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    notebook_amount DOUBLE PRECISION NOT NULL,
    system_amount DOUBLE PRECISION NOT NULL,
    difference_amount DOUBLE PRECISION NOT NULL,
    created_date TIMESTAMP,
    last_modified_date TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    state VARCHAR(50),
    CONSTRAINT uq_tm_field_control_line_month UNIQUE (field_control_id, year, month),
    CONSTRAINT chk_tm_field_control_line_month CHECK (month >= 1 AND month <= 12)
);

ALTER TABLE tontine_member_field_control_line
    ADD CONSTRAINT fk_tm_field_control_line_parent
        FOREIGN KEY (field_control_id) REFERENCES tontine_member_field_control(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tm_field_control_line_parent
    ON tontine_member_field_control_line (field_control_id);
