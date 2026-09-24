-- Rattrapage des valorisations stock commercial après ventes comptant (total_sold_value / PMP à 0).

ALTER TABLE credit_articles ADD COLUMN IF NOT EXISTS stock_item_id BIGINT;

-- 1. Historique de ventes (source la plus fiable lorsqu'il existe)
UPDATE commercial_monthly_stock_item cmsi
SET total_sold_value = h.total_delta
FROM (
    SELECT stock_item_id, SUM(delta_value) AS total_delta
    FROM commercial_monthly_stock_item_sold_value_history
    GROUP BY stock_item_id
) h
WHERE cmsi.id = h.stock_item_id
  AND cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) = 0
  AND h.total_delta > 0;

-- 2. Lignes de vente liées par stock_item_id
UPDATE commercial_monthly_stock_item cmsi
SET total_sold_value = ca.sold_value
FROM (
    SELECT ca.stock_item_id,
           SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)) AS sold_value
    FROM credit_articles ca
    JOIN articles a ON a.id = ca.articles_id
    WHERE ca.stock_item_id IS NOT NULL
      AND ca.visibility = 'ENABLED'
    GROUP BY ca.stock_item_id
) ca
WHERE cmsi.id = ca.stock_item_id
  AND cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) = 0
  AND ca.sold_value > 0;

-- 3. Ventes comptant sans stock_item_id : rapprochement article + commercial + mois
UPDATE commercial_monthly_stock_item cmsi
SET total_sold_value = matched.sold_value
FROM (
    SELECT cmsi_inner.id AS stock_item_id,
           SUM(
               ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)
           ) AS sold_value
    FROM commercial_monthly_stock_item cmsi_inner
    JOIN commercial_monthly_stock cms ON cms.id = cmsi_inner.monthly_stock_id
    JOIN credit c ON c.collector = cms.collector
        AND EXTRACT(MONTH FROM c.begin_date) = cms.month
        AND EXTRACT(YEAR FROM c.begin_date) = cms.year
        AND c.type = 'CASH'
        AND c.visibility = 'ENABLED'
    JOIN credit_articles ca ON ca.credit_id = c.id
        AND ca.articles_id = cmsi_inner.article_id
        AND ca.visibility = 'ENABLED'
    JOIN articles a ON a.id = ca.articles_id
    GROUP BY cmsi_inner.id
) matched
WHERE cmsi.id = matched.stock_item_id
  AND cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) = 0
  AND matched.sold_value > 0;

-- 4. Prix unitaires et PMP manquants sur le stock item
UPDATE commercial_monthly_stock_item cmsi
SET weighted_average_unit_price = CEIL(cmsi.total_sold_value / cmsi.quantity_sold),
    last_unit_price = CEIL(cmsi.total_sold_value / cmsi.quantity_sold)
WHERE cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) > 0
  AND (COALESCE(cmsi.weighted_average_unit_price, 0) <= 0 OR COALESCE(cmsi.last_unit_price, 0) <= 0);

UPDATE commercial_monthly_stock_item cmsi
SET weighted_average_purchase_price = CEIL(a.purchase_price),
    last_purchase_price = CEIL(a.purchase_price)
FROM articles a
WHERE cmsi.article_id = a.id
  AND cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) > 0
  AND (COALESCE(cmsi.weighted_average_purchase_price, 0) <= 0 OR COALESCE(cmsi.last_purchase_price, 0) <= 0)
  AND COALESCE(a.purchase_price, 0) > 0;

-- 5. Marge cumulée
UPDATE commercial_monthly_stock_item cmsi
SET total_marge_value = GREATEST(
        0,
        cmsi.total_sold_value - (cmsi.quantity_sold * COALESCE(cmsi.weighted_average_purchase_price, 0))
    )
WHERE cmsi.quantity_sold > 0
  AND COALESCE(cmsi.total_sold_value, 0) > 0
  AND COALESCE(cmsi.total_marge_value, 0) = 0;

-- 6. unit_price des lignes credit_articles cash encore à zéro
UPDATE credit_articles ca
SET unit_price = a.selling_price
FROM credit c,
     articles a
WHERE ca.credit_id = c.id
  AND ca.articles_id = a.id
  AND c.type = 'CASH'
  AND ca.visibility = 'ENABLED'
  AND COALESCE(ca.unit_price, 0) <= 0
  AND COALESCE(a.selling_price, 0) > 0;
