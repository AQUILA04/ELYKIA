ALTER TABLE cash_deposit ADD COLUMN IF NOT EXISTS credit_amount double precision;
ALTER TABLE cash_deposit ADD COLUMN IF NOT EXISTS tontine_amount double precision;
ALTER TABLE cash_deposit ADD COLUMN IF NOT EXISTS new_balance_amount double precision;

UPDATE cash_deposit
SET credit_amount = amount,
    tontine_amount = 0,
    new_balance_amount = 0
WHERE credit_amount IS NULL;

ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_credit_amount_deposited double precision DEFAULT 0;
ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_tontine_amount_deposited double precision DEFAULT 0;
ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_new_balance_amount_deposited double precision DEFAULT 0;

UPDATE daily_commercial_report
SET total_credit_amount_deposited = COALESCE(total_amount_deposited, 0),
    total_tontine_amount_deposited = 0,
    total_new_balance_amount_deposited = 0
WHERE total_credit_amount_deposited IS NULL OR total_credit_amount_deposited = 0;
