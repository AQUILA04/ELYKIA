-- =====================================================
-- Migration Flyway pour BI Dashboard
-- Ajout des nouvelles entités et enrichissement des existantes
-- =====================================================

-- 1. Enrichissement de la table Credit
ALTER TABLE credit ADD COLUMN IF NOT EXISTS profit_margin DOUBLE PRECISION;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS profit_margin_percentage DOUBLE PRECISION;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS payment_completion_rate DOUBLE PRECISION;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS expected_duration_days INTEGER;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS actual_duration_days INTEGER;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS payment_regularity_score DOUBLE PRECISION;
ALTER TABLE credit ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
ALTER TABLE credit ADD COLUMN IF NOT EXISTS season_period VARCHAR(10);
ALTER TABLE credit ADD COLUMN IF NOT EXISTS distribution_zone VARCHAR(100);
ALTER TABLE credit ADD COLUMN IF NOT EXISTS customer_segment VARCHAR(50);

-- Commentaires pour la table Credit
COMMENT ON COLUMN credit.profit_margin IS 'Marge bénéficiaire = totalAmount - totalPurchase';
COMMENT ON COLUMN credit.profit_margin_percentage IS '(profitMargin / totalPurchase) * 100';
COMMENT ON COLUMN credit.payment_completion_rate IS '(totalAmountPaid / totalAmount) * 100';
COMMENT ON COLUMN credit.expected_duration_days IS 'Durée prévue en jours';
COMMENT ON COLUMN credit.actual_duration_days IS 'Durée réelle si terminé';
COMMENT ON COLUMN credit.payment_regularity_score IS 'Score de régularité des paiements (0-100)';
COMMENT ON COLUMN credit.risk_level IS 'Niveau de risque: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN credit.season_period IS 'Période saisonnière: Q1, Q2, Q3, Q4 ou mois';
COMMENT ON COLUMN credit.distribution_zone IS 'Zone géographique du commercial';
COMMENT ON COLUMN credit.customer_segment IS 'Segmentation client (nouveau, fidèle, VIP, etc.)';

-- 2. Enrichissement de la table Articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reorder_point INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS optimal_stock_level INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS average_monthly_sales DOUBLE PRECISION;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS stock_turnover_rate DOUBLE PRECISION;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS days_of_stock_available INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS last_restock_date DATE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE;

-- Commentaires pour la table Articles
COMMENT ON COLUMN articles.reorder_point IS 'Seuil de réapprovisionnement';
COMMENT ON COLUMN articles.optimal_stock_level IS 'Niveau de stock optimal';
COMMENT ON COLUMN articles.average_monthly_sales IS 'Ventes moyennes mensuelles';
COMMENT ON COLUMN articles.stock_turnover_rate IS 'Taux de rotation du stock';
COMMENT ON COLUMN articles.days_of_stock_available IS 'Jours de stock disponible';
COMMENT ON COLUMN articles.last_restock_date IS 'Date du dernier réapprovisionnement';
COMMENT ON COLUMN articles.category IS 'Catégorie produit pour analyse';
COMMENT ON COLUMN articles.is_seasonal IS 'Produit saisonnier';

-- 3. Création de la table CreditPaymentEvent
CREATE TABLE IF NOT EXISTS credit_payment_event (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT,
    payment_date TIMESTAMP,
    amount DOUBLE PRECISION,
    days_from_last_payment INTEGER,
    is_on_time BOOLEAN,
    payment_method VARCHAR(50),
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    CONSTRAINT fk_payment_event_credit FOREIGN KEY (credit_id) REFERENCES credit(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_event_credit ON credit_payment_event(credit_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_date ON credit_payment_event(payment_date);

COMMENT ON TABLE credit_payment_event IS 'Événements de paiement pour analyse de régularité';
COMMENT ON COLUMN credit_payment_event.payment_date IS 'Date et heure du paiement';
COMMENT ON COLUMN credit_payment_event.amount IS 'Montant du paiement';
COMMENT ON COLUMN credit_payment_event.days_from_last_payment IS 'Jours depuis le dernier paiement';
COMMENT ON COLUMN credit_payment_event.is_on_time IS 'Paiement dans les délais';
COMMENT ON COLUMN credit_payment_event.payment_method IS 'Méthode de paiement: CASH, MOBILE_MONEY, etc.';

-- 4. Création de la table StockMovement
CREATE TABLE IF NOT EXISTS stock_movement (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    movement_date TIMESTAMP NOT NULL,
    reason VARCHAR(500),
    performed_by VARCHAR(255),
    related_credit_id BIGINT,
    unit_cost DOUBLE PRECISION,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    CONSTRAINT fk_stock_movement_article FOREIGN KEY (article_id) REFERENCES articles(id),
    CONSTRAINT fk_stock_movement_credit FOREIGN KEY (related_credit_id) REFERENCES credit(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movement_article ON stock_movement(article_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_date ON stock_movement(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON stock_movement(movement_type);

COMMENT ON TABLE stock_movement IS 'Traçabilité complète des mouvements de stock';
COMMENT ON COLUMN stock_movement.movement_type IS 'Type: ENTRY, RELEASE, RETURN, ADJUSTMENT, LOSS';
COMMENT ON COLUMN stock_movement.quantity IS 'Quantité du mouvement';
COMMENT ON COLUMN stock_movement.stock_before IS 'Stock avant le mouvement';
COMMENT ON COLUMN stock_movement.stock_after IS 'Stock après le mouvement';
COMMENT ON COLUMN stock_movement.reason IS 'Raison du mouvement';
COMMENT ON COLUMN stock_movement.related_credit_id IS 'Crédit lié si applicable';

-- 5. Création de la table CommercialPerformance
CREATE TABLE IF NOT EXISTS commercial_performance (
    id BIGSERIAL PRIMARY KEY,
    collector VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales_count INTEGER,
    total_sales_amount DOUBLE PRECISION,
    total_profit DOUBLE PRECISION,
    average_sale_amount DOUBLE PRECISION,
    total_collected DOUBLE PRECISION,
    collection_rate DOUBLE PRECISION,
    on_time_payments_count INTEGER,
    late_payments_count INTEGER,
    active_clients_count INTEGER,
    new_clients_count INTEGER,
    client_retention_rate DOUBLE PRECISION,
    portfolio_at_risk DOUBLE PRECISION,
    critical_accounts_count INTEGER,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    CONSTRAINT uk_commercial_performance UNIQUE (collector, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_commercial_perf_collector ON commercial_performance(collector);
CREATE INDEX IF NOT EXISTS idx_commercial_perf_period ON commercial_performance(period_start, period_end);

COMMENT ON TABLE commercial_performance IS 'Agrégation des performances commerciales par période';
COMMENT ON COLUMN commercial_performance.collector IS 'Nom du commercial';
COMMENT ON COLUMN commercial_performance.period_start IS 'Début de la période';
COMMENT ON COLUMN commercial_performance.period_end IS 'Fin de la période';
COMMENT ON COLUMN commercial_performance.total_sales_count IS 'Nombre total d Agrégation';
-- 5. Création de la table CommercialPerformance
CREATE TABLE IF NOT EXISTS commercial_performance (
    id BIGSERIAL PRIMARY KEY,
    collector VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales_count INTEGER,
    total_sales_amount DOUBLE PRECISION,
    total_profit DOUBLE PRECISION,
    average_sale_amount DOUBLE PRECISION,
    total_collected DOUBLE PRECISION,
    collection_rate DOUBLE PRECISION,
    on_time_payments_count INTEGER,
    late_payments_count INTEGER,
    active_clients_count INTEGER,
    new_clients_count INTEGER,
    client_retention_rate DOUBLE PRECISION,
    portfolio_at_risk DOUBLE PRECISION,
    critical_accounts_count INTEGER,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP,
    CONSTRAINT uk_commercial_performance UNIQUE (collector, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_commercial_perf_collector ON commercial_performance(collector);
CREATE INDEX IF NOT EXISTS idx_commercial_perf_period ON commercial_performance(period_start, period_end);

COMMENT ON TABLE commercial_performance IS 'Agrégation des performances commerciales par période';

-- 6. Création de la table DailyBusinessSnapshot
CREATE TABLE IF NOT EXISTS daily_business_snapshot (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    new_credits_count INTEGER,
    new_credits_total_amount DOUBLE PRECISION,
    new_credits_profit DOUBLE PRECISION,
    daily_collections DOUBLE PRECISION,
    payments_received_count INTEGER,
    total_stock_value DOUBLE PRECISION,
    low_stock_items_count INTEGER,
    out_of_stock_items_count INTEGER,
    total_outstanding_amount DOUBLE PRECISION,
    total_overdue_amount DOUBLE PRECISION,
    active_credits_count INTEGER,
    cash_in_hand DOUBLE PRECISION,
    expected_daily_collection DOUBLE PRECISION,
    created_by VARCHAR(255),
    created_date TIMESTAMP,
    last_modified_by VARCHAR(255),
    last_modified_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshot_date ON daily_business_snapshot(snapshot_date);

COMMENT ON TABLE daily_business_snapshot IS 'Snapshot quotidien de l''activité business';

-- 7. Mise à jour des données existantes (valeurs par défaut)
UPDATE credit SET 
    profit_margin = COALESCE(total_amount, 0) - COALESCE(total_purchase, 0),
    payment_completion_rate = CASE 
        WHEN COALESCE(total_amount, 0) > 0 
        THEN (COALESCE(total_amount_paid, 0) / total_amount) * 100 
        ELSE 0 
    END,
    risk_level = 'LOW',
    season_period = CASE 
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 1 AND 3 THEN 'Q1'
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 4 AND 6 THEN 'Q2'
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4'
    END
WHERE profit_margin IS NULL;

UPDATE credit SET 
    profit_margin_percentage = CASE 
        WHEN COALESCE(total_purchase, 0) > 0 
        THEN (profit_margin / total_purchase) * 100 
        ELSE 0 
    END
WHERE profit_margin_percentage IS NULL AND total_purchase > 0;

-- 8. Mise à jour des articles (valeurs par défaut)
UPDATE articles SET 
    is_seasonal = FALSE,
    reorder_point = GREATEST(stock_quantity / 4, 5),
    optimal_stock_level = stock_quantity * 2
WHERE is_seasonal IS NULL;
