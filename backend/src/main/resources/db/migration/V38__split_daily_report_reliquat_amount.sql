-- Split total_reliquat_amount into total_reliquat_generated_amount and total_reliquat_used_amount
ALTER TABLE daily_commercial_report DROP COLUMN IF EXISTS total_reliquat_amount;
ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_reliquat_generated_amount DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE daily_commercial_report ADD COLUMN IF NOT EXISTS total_reliquat_used_amount DOUBLE PRECISION DEFAULT 0.0;
