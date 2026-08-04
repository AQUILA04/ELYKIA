-- Liste des ventes liées à un stock mensuel commercial (périmètre KPI « Valeur Stock Vendu »).
-- Préférer ce filtre (stock_item_id + history) plutôt que begin_date seul :
-- les rattrapages (RAT-*) peuvent dater un autre mois tout en débitant ce stock.
--
-- Ancien filtre (à éviter pour réconcilier avec le stock) :
--   AND c.begin_date BETWEEN DATE '2026-05-01' AND DATE '2026-05-31'

WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007'
      AND cms.year = 2026
      AND cms.month = 5
),
linked AS (
    SELECT credit_id, MAX(sold_value) AS sold_on_stock
    FROM (
        SELECT h.credit_id, SUM(h.delta_value) AS sold_value
        FROM commercial_monthly_stock_item_sold_value_history h
        WHERE h.stock_item_id IN (SELECT stock_item_id FROM stock_items)
          AND h.credit_id IS NOT NULL
        GROUP BY h.credit_id
        UNION ALL
        SELECT ca.credit_id,
               SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0))
        FROM credit_articles ca
        JOIN articles a ON a.id = ca.articles_id
        WHERE ca.stock_item_id IN (SELECT stock_item_id FROM stock_items)
        GROUP BY ca.credit_id
    ) s
    GROUP BY credit_id
)
SELECT
    TRIM(CONCAT(cl.firstname, ' ', cl.lastname)) AS client_full_name,
    cl.phone                                      AS client_phone,
    c.reference                                   AS reference_credit,
    c.begin_date                                  AS date_vente,
    c.total_amount                                AS montant_total,
    c.total_amount_paid                           AS montant_total_paye,
    c.total_amount_remaining                      AS montant_total_restant,
    l.sold_on_stock                               AS valeur_impute_stock,
    CASE c.status
        WHEN 'INPROGRESS' THEN 'en cours'
        WHEN 'SETTLED'    THEN 'clôturé'
        ELSE c.status
    END                                           AS status
FROM linked l
JOIN credit c ON c.id = l.credit_id
JOIN client cl ON cl.id = c.client_id
WHERE c.visibility <> 'DELETED'
  AND c.status IN ('INPROGRESS', 'SETTLED')
  AND c.type = 'CREDIT'
ORDER BY
    CASE WHEN c.status = 'INPROGRESS' THEN 0 ELSE 1 END,
    c.begin_date,
    c.reference;
