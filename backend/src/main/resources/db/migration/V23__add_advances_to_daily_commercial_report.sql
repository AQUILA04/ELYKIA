ALTER TABLE daily_commercial_report 
ADD COLUMN IF NOT EXISTS total_advances_amount DOUBLE PRECISION DEFAULT 0.0;
