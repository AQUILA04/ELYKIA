-- Notes/commentaires pour réalignement auto du stock au prix catalogue
ALTER TABLE stock_request
    ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE stock_tontine_request
    ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE stock_tontine_return
    ADD COLUMN IF NOT EXISTS comment TEXT,
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS received_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS canceled_date DATE,
    ADD COLUMN IF NOT EXISTS canceled_by VARCHAR(255);

-- Agrandir la note des retours commerciaux (message auto prix)
ALTER TABLE stock_return
    ALTER COLUMN note TYPE TEXT;
