ALTER TABLE cash_deposit ADD COLUMN IF NOT EXISTS remittance_id bigint;

ALTER TABLE cash_deposit
    ADD CONSTRAINT cash_deposit_remittance_fk
    FOREIGN KEY (remittance_id) REFERENCES cash_period_remittance(id);

CREATE INDEX IF NOT EXISTS idx_cash_deposit_remittance_id ON cash_deposit(remittance_id);

ALTER TABLE cash_period_remittance DROP CONSTRAINT IF EXISTS cash_period_remittance_year_month_key;

-- Lier les versements déjà couverts par une remise existante
UPDATE cash_deposit cd
SET remittance_id = cpr.id
FROM cash_period_remittance cpr
WHERE cd.remittance_id IS NULL
  AND cd.amount > 0
  AND EXTRACT(YEAR FROM cd.date) = cpr.year
  AND EXTRACT(MONTH FROM cd.date) = cpr.month;
