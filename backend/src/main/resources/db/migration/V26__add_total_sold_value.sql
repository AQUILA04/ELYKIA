-- Add totalSoldValue column to commercial_monthly_stock_item table
ALTER TABLE commercial_monthly_stock_item ADD COLUMN IF NOT EXISTS total_sold_value DOUBLE PRECISION DEFAULT 0;
