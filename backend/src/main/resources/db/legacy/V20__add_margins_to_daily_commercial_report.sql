ALTER TABLE daily_commercial_report
ADD COLUMN IF NOT EXISTS credit_sales_margin double precision DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_request_margin double precision DEFAULT 0;
