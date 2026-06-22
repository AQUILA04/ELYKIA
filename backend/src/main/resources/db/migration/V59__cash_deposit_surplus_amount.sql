ALTER TABLE cash_deposit ADD COLUMN IF NOT EXISTS surplus_amount double precision DEFAULT 0;

UPDATE cash_deposit
SET surplus_amount = 0
WHERE surplus_amount IS NULL;

ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_surplus_amount_deposited double precision DEFAULT 0;

UPDATE daily_commercial_report
SET total_surplus_amount_deposited = 0
WHERE total_surplus_amount_deposited IS NULL;
