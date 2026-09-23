ALTER TABLE stock_return ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE stock_return ADD COLUMN IF NOT EXISTS target_stock_id BIGINT;
ALTER TABLE stock_return ADD COLUMN IF NOT EXISTS note VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_return_target_stock'
    ) THEN
        ALTER TABLE stock_return ADD CONSTRAINT fk_stock_return_target_stock
            FOREIGN KEY (target_stock_id) REFERENCES commercial_monthly_stock (id);
    END IF;
END $$;

ALTER TABLE stock_return_item ADD COLUMN IF NOT EXISTS stock_item_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_return_item_stock_item'
    ) THEN
        ALTER TABLE stock_return_item ADD CONSTRAINT fk_stock_return_item_stock_item
            FOREIGN KEY (stock_item_id) REFERENCES commercial_monthly_stock_item (id);
    END IF;
END $$;
