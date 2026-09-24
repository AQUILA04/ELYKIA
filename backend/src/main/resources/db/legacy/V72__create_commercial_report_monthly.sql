-- Reclassement des versements tontine migrés à tort en crédit (pré-split V57) sur daily_commercial_report uniquement.
-- Critères : à verser crédit = 0, versé crédit > 0, à verser tontine > 0, versé tontine = 0.
UPDATE daily_commercial_report d
SET
    total_tontine_amount_deposited = COALESCE(d.total_tontine_amount_deposited, 0)
                                     + COALESCE(d.total_credit_amount_deposited, 0),
    total_credit_amount_deposited  = 0,
    date_mod                       = NOW()
WHERE
    (
        COALESCE(d.total_advances_amount, 0)
        + COALESCE(d.collections_amount, 0)
        + COALESCE(d.total_reliquat_generated_amount, 0)
        - COALESCE(d.total_reliquat_used_amount, 0)
    ) = 0
    AND COALESCE(d.total_credit_amount_deposited, 0) > 0
    AND COALESCE(d.tontine_collections_amount, 0) > 0
    AND COALESCE(d.total_tontine_amount_deposited, 0) = 0;

CREATE TABLE IF NOT EXISTS commercial_report_monthly (
    id BIGSERIAL PRIMARY KEY,
    commercial_username VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    credit_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    credit_sales_count INT NOT NULL DEFAULT 0,
    collections_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_advances_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_credit_amount_deposited DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_commercial_report_monthly UNIQUE (commercial_username, year, month)
);

CREATE INDEX IF NOT EXISTS idx_commercial_report_monthly_period
    ON commercial_report_monthly (commercial_username, year, month);

COMMENT ON TABLE commercial_report_monthly IS 'Agrégation mensuelle des rapports commerciaux journaliers pour requêtes annuelles performantes';

INSERT INTO commercial_report_monthly (
    commercial_username,
    year,
    month,
    credit_sales_amount,
    credit_sales_count,
    collections_amount,
    total_advances_amount,
    total_credit_amount_deposited
)
SELECT
    d.commercial_username,
    EXTRACT(YEAR FROM d.date)::INT,
    EXTRACT(MONTH FROM d.date)::INT,
    COALESCE(SUM(d.credit_sales_amount), 0),
    COALESCE(SUM(d.credit_sales_count), 0),
    COALESCE(SUM(d.collections_amount), 0),
    COALESCE(SUM(d.total_advances_amount), 0),
    COALESCE(SUM(d.total_credit_amount_deposited), 0)
FROM daily_commercial_report d
GROUP BY d.commercial_username, EXTRACT(YEAR FROM d.date), EXTRACT(MONTH FROM d.date)
ON CONFLICT (commercial_username, year, month) DO UPDATE SET
    credit_sales_amount = EXCLUDED.credit_sales_amount,
    credit_sales_count = EXCLUDED.credit_sales_count,
    collections_amount = EXCLUDED.collections_amount,
    total_advances_amount = EXCLUDED.total_advances_amount,
    total_credit_amount_deposited = EXCLUDED.total_credit_amount_deposited,
    updated_at = CURRENT_TIMESTAMP;
