CREATE TABLE IF NOT EXISTS credit_field_control (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT NOT NULL,
    notebook_total_amount DOUBLE PRECISION NOT NULL,
    system_total_amount_paid DOUBLE PRECISION NOT NULL,
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

ALTER TABLE credit_field_control
    ADD CONSTRAINT fk_credit_field_control_credit
        FOREIGN KEY (credit_id) REFERENCES credit(id);

CREATE INDEX IF NOT EXISTS idx_credit_field_control_credit_observed
    ON credit_field_control (credit_id, observed_at DESC);
