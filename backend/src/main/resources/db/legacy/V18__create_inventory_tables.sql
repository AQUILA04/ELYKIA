-- Table inventory
CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    inventory_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(255) NOT NULL,
    completed_at TIMESTAMP
);

-- Table inventory_item
CREATE TABLE IF NOT EXISTS inventory_item (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    inventory_id BIGINT NOT NULL,
    article_id BIGINT NOT NULL,
    system_quantity INTEGER NOT NULL,
    physical_quantity INTEGER,
    difference INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reconciliation_comment VARCHAR(1000),
    reconciled_by VARCHAR(255),
    reconciled_at TIMESTAMP,
    mark_as_debt BOOLEAN NOT NULL DEFAULT FALSE,
    debt_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_inventory_item_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_item_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Table inventory_reconciliation
CREATE TABLE IF NOT EXISTS inventory_reconciliation (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    inventory_item_id BIGINT NOT NULL,
    reconciliation_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    comment VARCHAR(1000),
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    CONSTRAINT fk_inventory_reconciliation_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory(inventory_date);
CREATE INDEX IF NOT EXISTS idx_inventory_item_inventory_id ON inventory_item(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_article_id ON inventory_item(article_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_status ON inventory_item(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reconciliation_item_id ON inventory_reconciliation(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reconciliation_performed_at ON inventory_reconciliation(performed_at);

-- Mise à jour de la contrainte pour article_history pour inclure INVENTORY_ADJUSTMENT
ALTER TABLE public.article_history DROP CONSTRAINT IF EXISTS article_history_operation_type_check;

ALTER TABLE public.article_history
ADD CONSTRAINT article_history_operation_type_check
CHECK (operation_type IN ('ENTREE', 'SORTIE', 'RESET', 'INVENTORY_ADJUSTMENT'));

