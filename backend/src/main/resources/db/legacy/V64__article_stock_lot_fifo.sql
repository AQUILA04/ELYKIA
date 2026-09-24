-- FIFO stock valuation: lots tables + feature flag parameter (disabled by default)

CREATE TABLE IF NOT EXISTS article_stock_lot (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    article_id BIGINT NOT NULL REFERENCES articles(id),
    quantity_initial INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_purchase_price DOUBLE PRECISION NOT NULL,
    entry_date DATE NOT NULL,
    stock_reception_item_id BIGINT REFERENCES stock_reception_item(id),
    source_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    CONSTRAINT article_stock_lot_visibility_check CHECK (
        visibility IN ('ENABLED', 'DISABLED', 'DELETED')
    )
);

CREATE INDEX IF NOT EXISTS idx_article_stock_lot_article_fifo
    ON article_stock_lot (article_id, entry_date, id)
    WHERE quantity_remaining > 0;

CREATE TABLE IF NOT EXISTS article_stock_lot_consumption (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    lot_id BIGINT NOT NULL REFERENCES article_stock_lot(id),
    quantity INTEGER NOT NULL,
    unit_purchase_price DOUBLE PRECISION NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(100),
    source_id BIGINT,
    CONSTRAINT article_stock_lot_consumption_visibility_check CHECK (
        visibility IN ('ENABLED', 'DISABLED', 'DELETED')
    )
);

CREATE INDEX IF NOT EXISTS idx_article_stock_lot_consumption_lot
    ON article_stock_lot_consumption (lot_id);

INSERT INTO parameters (reg_user_id, date_reg, visibility, parkey, parval, pardesc)
SELECT 'SYSTEM', NOW(), 'ENABLED',
       'ENABLED_FIFO_STOCK_VALUATION',
       'false',
       'Activer la valorisation FIFO du stock magasin (lots et coût réel des sorties)'
WHERE NOT EXISTS (
    SELECT 1 FROM parameters WHERE parkey = 'ENABLED_FIFO_STOCK_VALUATION'
);
