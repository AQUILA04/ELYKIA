-- Migration to add status to commercial_monthly_stock and month/year to stock_request
ALTER TABLE commercial_monthly_stock
ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';

ALTER TABLE stock_request
ADD COLUMN month INT;

ALTER TABLE stock_request
ADD COLUMN year INT;
