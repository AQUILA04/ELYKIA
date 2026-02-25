-- V25__create_credit_collector_history.sql

CREATE TABLE credit_collector_history (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT NOT NULL,
    old_collector VARCHAR(255) NOT NULL,
    new_collector VARCHAR(255) NOT NULL,
    total_amount DOUBLE PRECISION,
    total_amount_paid DOUBLE PRECISION,
    total_amount_remaining DOUBLE PRECISION,
    change_date TIMESTAMP NOT NULL,
    REG_USER_ID VARCHAR(50) NOT NULL,
    DATE_REG TIMESTAMP NOT NULL,
    MOD_USER_ID VARCHAR(50),
    DATE_MOD TIMESTAMP,
    visibility VARCHAR(255) NOT NULL,
    CONSTRAINT fk_credit_collector_history_credit FOREIGN KEY (credit_id) REFERENCES credit (id)
);
