-- Vente comptant : encaissement immédiat, remise physique par le magasinier.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS reserved_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE credit ADD COLUMN IF NOT EXISTS pending_warehouse_delivery boolean NOT NULL DEFAULT false;

ALTER TABLE stock_request ADD COLUMN IF NOT EXISTS credit_id bigint;

ALTER TABLE stock_request DROP CONSTRAINT IF EXISTS fk_stock_request_credit;
ALTER TABLE stock_request
    ADD CONSTRAINT fk_stock_request_credit FOREIGN KEY (credit_id) REFERENCES credit (id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_stock_request_credit ON stock_request (credit_id);
