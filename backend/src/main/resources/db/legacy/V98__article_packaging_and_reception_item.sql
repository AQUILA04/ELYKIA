-- Packaging d'achat catalogue (références gros / demi-gros)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS units_per_package INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS wholesale_purchase_price DOUBLE PRECISION;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS half_wholesale_purchase_price DOUBLE PRECISION;

-- Trace packaging sur les lignes de réception (FIFO)
ALTER TABLE stock_reception_item ADD COLUMN IF NOT EXISTS entry_packaging_mode VARCHAR(32);
ALTER TABLE stock_reception_item ADD COLUMN IF NOT EXISTS package_count INTEGER;
ALTER TABLE stock_reception_item ADD COLUMN IF NOT EXISTS package_price DOUBLE PRECISION;
ALTER TABLE stock_reception_item ADD COLUMN IF NOT EXISTS packaging_type_snapshot VARCHAR(32);
ALTER TABLE stock_reception_item ADD COLUMN IF NOT EXISTS units_per_package_snapshot INTEGER;
