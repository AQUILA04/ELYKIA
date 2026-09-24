-- Migration V103 : Annulation de ventes commerciale (Run, Fichiers, Outbox, Enum)

-- 1. Table des runs d'annulation
CREATE TABLE IF NOT EXISTS sale_cancellation_run (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    commercial_username VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    credit_status VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    cancellation_reason TEXT NOT NULL,
    triggered_by VARCHAR(255) NOT NULL,
    total_sales_found INTEGER DEFAULT 0,
    cancelled_sales_count INTEGER DEFAULT 0,
    cancelled_sales_amount DOUBLE PRECISION DEFAULT 0,
    excluded_sales_count INTEGER DEFAULT 0,
    excluded_sales_amount DOUBLE PRECISION DEFAULT 0,
    pdf_file_count INTEGER DEFAULT 0,
    archive_file_name VARCHAR(255),
    archive_storage_key VARCHAR(500),
    error_message TEXT,
    excluded_sales_details TEXT
);

-- 2. Table des fichiers PDF d'audit individuels et du rapport global
CREATE TABLE IF NOT EXISTS sale_cancellation_file (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    run_id BIGINT NOT NULL REFERENCES sale_cancellation_run(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'SALE_AUDIT_PDF', 'GLOBAL_SUMMARY_PDF', 'GLOBAL_ZIP'
    storage_bucket VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    credit_id BIGINT,
    credit_reference VARCHAR(255),
    client_name VARCHAR(255),
    amount DOUBLE PRECISION
);

-- 3. Table Outbox pour retry des uploads MinIO
CREATE TABLE IF NOT EXISTS sale_cancellation_outbox_entry (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    run_id BIGINT REFERENCES sale_cancellation_run(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    local_file_path VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT
);

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_sale_cancellation_run_comm ON sale_cancellation_run(commercial_username, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sale_cancellation_file_run ON sale_cancellation_file(run_id);
CREATE INDEX IF NOT EXISTS idx_sale_cancellation_outbox_status ON sale_cancellation_outbox_entry(status, retry_count);

-- 5. Mise à jour de la contrainte CHECK pour daily_operation_log.type (ajout de CREDIT_SALE_CANCEL)
ALTER TABLE daily_operation_log
DROP CONSTRAINT IF EXISTS daily_operation_log_type_check;

ALTER TABLE daily_operation_log
    ADD CONSTRAINT daily_operation_log_type_check
        CHECK (type IN (
            'CREDIT_COLLECTION',
            'CREDIT_COLLECTION_CANCEL',
            'TONTINE_COLLECTION',
            'TONTINE_COLLECTION_CANCEL',
            'ORDER',
            'NEW_ACCOUNT',
            'CASH_DEPOSIT',
            'STOCK_RETURN',
            'STOCK_REQUEST',
            'CASH_DEPOSIT_CANCEL',
            'STOCK_TONTINE_REQUEST',
            'STOCK_TONTINE_RETURN',
            'TONTINE_DELIVERY',
            'CREDIT_SALES',
            'CREDIT_SALE_CANCEL',
            'NEW_CLIENT',
            'TONTINE_MEMBER_ENROLLMENT',
            'CREDIT',
            'TONTINE',
            'CASH'
        ));
