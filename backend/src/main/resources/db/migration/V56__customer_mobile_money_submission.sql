-- Customer mobile money payment submissions (pending agency validation)

CREATE TABLE IF NOT EXISTS customer_mobile_money_submission (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'System',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    client_id BIGINT NOT NULL,
    credit_id BIGINT NOT NULL,
    installment_number INTEGER NOT NULL,
    expected_amount DOUBLE PRECISION NOT NULL,
    mobile_money_phone VARCHAR(20) NOT NULL,
    mobile_money_amount DOUBLE PRECISION NOT NULL,
    mobile_money_reference VARCHAR(100) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIE'
);

CREATE INDEX IF NOT EXISTS idx_cmm_submission_client ON customer_mobile_money_submission (client_id);
CREATE INDEX IF NOT EXISTS idx_cmm_submission_credit ON customer_mobile_money_submission (credit_id);
