-- Migration SQL pour la gestion des livraisons de tontine
-- Phase 1 : Création des tables TontineDelivery et TontineDeliveryItem

-- Table: tontine_delivery
CREATE TABLE IF NOT EXISTS tontine_delivery (
    id BIGSERIAL PRIMARY KEY,
    tontine_member_id BIGINT NOT NULL UNIQUE,
    delivery_date TIMESTAMP NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    remaining_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
    commercial_username VARCHAR(255) NOT NULL,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    CONSTRAINT fk_tontine_delivery_member 
        FOREIGN KEY (tontine_member_id) 
        REFERENCES tontine_member(id) 
        ON DELETE CASCADE
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_tontine_delivery_member_id 
    ON tontine_delivery(tontine_member_id);

CREATE INDEX IF NOT EXISTS idx_tontine_delivery_date 
    ON tontine_delivery(delivery_date);

CREATE INDEX IF NOT EXISTS idx_tontine_delivery_commercial 
    ON tontine_delivery(commercial_username);

-- Table: tontine_delivery_item
CREATE TABLE IF NOT EXISTS tontine_delivery_item (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    article_id BIGINT NOT NULL,
    article_name VARCHAR(255) NOT NULL,
    article_code VARCHAR(100),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT fk_tontine_delivery_item_delivery 
        FOREIGN KEY (delivery_id) 
        REFERENCES tontine_delivery(id) 
        ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tontine_delivery_item_delivery_id 
    ON tontine_delivery_item(delivery_id);

CREATE INDEX IF NOT EXISTS idx_tontine_delivery_item_article_id 
    ON tontine_delivery_item(article_id);

-- Commentaires pour la documentation
COMMENT ON TABLE tontine_delivery IS 'Table des livraisons de fin d''année pour les membres de tontine';
COMMENT ON TABLE tontine_delivery_item IS 'Table des articles livrés dans chaque livraison de tontine';

COMMENT ON COLUMN tontine_delivery.tontine_member_id IS 'Référence unique vers le membre de tontine';
COMMENT ON COLUMN tontine_delivery.delivery_date IS 'Date et heure de la livraison';
COMMENT ON COLUMN tontine_delivery.total_amount IS 'Montant total des articles livrés';
COMMENT ON COLUMN tontine_delivery.remaining_balance IS 'Solde non utilisé (montant épargné - montant livré)';
COMMENT ON COLUMN tontine_delivery.commercial_username IS 'Username du commercial ayant effectué la livraison';

COMMENT ON COLUMN tontine_delivery_item.delivery_id IS 'Référence vers la livraison';
COMMENT ON COLUMN tontine_delivery_item.article_id IS 'Référence vers l''article';
COMMENT ON COLUMN tontine_delivery_item.quantity IS 'Quantité d''articles livrés';
COMMENT ON COLUMN tontine_delivery_item.unit_price IS 'Prix unitaire au moment de la livraison';
COMMENT ON COLUMN tontine_delivery_item.total_price IS 'Prix total (quantity × unit_price)';
