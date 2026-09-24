-- Customer-space tontine Mobile Money payment declarations (pending agency validation)

CREATE TABLE IF NOT EXISTS customer_tontine_mm_submission (
    id BIGSERIAL PRIMARY KEY,
    REG_USER_ID VARCHAR(50),
    DATE_REG TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MOD_USER_ID VARCHAR(50),
    DATE_MOD TIMESTAMP,
    visibility VARCHAR(50) NOT NULL DEFAULT 'ENABLED',
    client_id BIGINT NOT NULL,
    tontine_member_id BIGINT NOT NULL,
    expected_amount DOUBLE PRECISION NOT NULL,
    mobile_money_phone VARCHAR(20) NOT NULL,
    mobile_money_amount DOUBLE PRECISION NOT NULL,
    mobile_money_reference VARCHAR(100) NOT NULL,
    notes TEXT,
    operation_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIE',
    validated_by VARCHAR(100),
    validated_at TIMESTAMP,
    tontine_collection_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_ctmm_submission_client
    ON customer_tontine_mm_submission (client_id);

CREATE INDEX IF NOT EXISTS idx_ctmm_submission_member
    ON customer_tontine_mm_submission (tontine_member_id);

CREATE INDEX IF NOT EXISTS idx_ctmm_submission_status
    ON customer_tontine_mm_submission (status);

CREATE INDEX IF NOT EXISTS idx_ctmm_submission_visibility_status
    ON customer_tontine_mm_submission (visibility, status);
