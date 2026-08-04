-- Diagnostic recouvrement stock mensuel commercial
-- Remplacer les paramètres ci-dessous avant exécution.

-- \set collector 'COM001'
-- \set stock_year 2026
-- \set stock_month 5

-- =============================================================================
-- 1. Synthèse stock mensuel (référence KPI « total dû »)
-- =============================================================================
SELECT cms.id AS stock_id,
       cms.collector,
       cms.month,
       cms.year,
       cms.status,
       COUNT(cmsi.id) AS item_count,
       COALESCE(SUM(cmsi.quantity_remaining * cmsi.weighted_average_unit_price), 0) AS stock_restant_valeur,
       COALESCE(SUM(cmsi.total_sold_value), 0) AS stock_vendu_valeur,
       COALESCE(SUM(cmsi.quantity_remaining * cmsi.weighted_average_unit_price), 0)
           + COALESCE(SUM(cmsi.total_sold_value), 0) AS total_du
FROM commercial_monthly_stock cms
JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
WHERE cms.collector = 'COM001'   -- :collector
  AND cms.year = 2026            -- :stock_year
  AND cms.month = 5              -- :stock_month
GROUP BY cms.id, cms.collector, cms.month, cms.year, cms.status;

-- =============================================================================
-- 2. Écart recouvré + reste vs total dû (détecte le bug affiché)
--    Remplacez recovered et remaining par les valeurs API si besoin.
-- =============================================================================
WITH stock AS (
    SELECT cms.id,
           COALESCE(SUM(cmsi.total_sold_value), 0)
               + COALESCE(SUM(cmsi.quantity_remaining * cmsi.weighted_average_unit_price), 0) AS total_du
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
    GROUP BY cms.id
)
SELECT total_du,
       714949 AS recovered_api,      -- valeur affichée
       1113049 AS remaining_api,     -- valeur affichée
       714949 + 1113049 AS sum_recovered_remaining,
       (714949 + 1113049) - total_du AS ecart_sur_total_du
FROM stock;

-- =============================================================================
-- 3. Crédits liés au stock (3 sources comme le backend)
-- =============================================================================
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id, cmsi.article_id, cmsi.total_sold_value
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
),
from_history AS (
    SELECT h.credit_id, SUM(h.delta_value) AS sold_value, 'history' AS source
    FROM commercial_monthly_stock_item_sold_value_history h
    WHERE h.stock_item_id IN (SELECT stock_item_id FROM stock_items)
      AND h.credit_id IS NOT NULL
    GROUP BY h.credit_id
),
from_stock_item_id AS (
    SELECT ca.credit_id,
           SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)) AS sold_value,
           'stock_item_id' AS source
    FROM credit_articles ca
    JOIN articles a ON a.id = ca.articles_id
    WHERE ca.stock_item_id IN (SELECT stock_item_id FROM stock_items)
    GROUP BY ca.credit_id
),
from_month_match AS (
    SELECT ca.credit_id,
           SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)) AS sold_value,
           'month_article_match' AS source
    FROM credit_articles ca
    JOIN credit c ON c.id = ca.credit_id
    JOIN articles a ON a.id = ca.articles_id
    WHERE c.collector = 'COM001'
      AND c.begin_date >= DATE '2026-05-01'
      AND c.begin_date < DATE '2026-06-01'
      AND ca.articles_id IN (SELECT DISTINCT article_id FROM stock_items)
    GROUP BY ca.credit_id
),
merged AS (
    SELECT credit_id, MAX(sold_value) AS sold_on_stock
    FROM (
        SELECT credit_id, sold_value FROM from_history
        UNION ALL
        SELECT credit_id, sold_value FROM from_stock_item_id
        UNION ALL
        SELECT credit_id, sold_value FROM from_month_match
    ) s
    GROUP BY credit_id
)
SELECT c.id,
       c.reference,
       c.type,
       c.status,
       c.total_amount,
       c.total_amount_paid,
       c.total_amount_remaining,
       m.sold_on_stock,
       CASE WHEN c.type = 'CASH' THEN m.sold_on_stock
            ELSE c.total_amount_paid * LEAST(1, m.sold_on_stock / NULLIF(c.total_amount, 0))
       END AS recovered_part,
       CASE WHEN c.type = 'CASH' THEN 0
            ELSE c.total_amount_remaining * LEAST(1, m.sold_on_stock / NULLIF(c.total_amount, 0))
       END AS remaining_part
FROM merged m
JOIN credit c ON c.id = m.credit_id
ORDER BY m.sold_on_stock DESC;

-- =============================================================================
-- 4. SUR-ATTRIBUTION : somme des ventes attribuées aux crédits vs total_sold_value stock
-- =============================================================================
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id, cmsi.total_sold_value
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
),
merged AS (
    SELECT credit_id, MAX(sold_value) AS sold_on_stock
    FROM (
        SELECT h.credit_id, SUM(h.delta_value) AS sold_value
        FROM commercial_monthly_stock_item_sold_value_history h
        WHERE h.stock_item_id IN (SELECT stock_item_id FROM stock_items) AND h.credit_id IS NOT NULL
        GROUP BY h.credit_id
        UNION ALL
        SELECT ca.credit_id,
               SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0))
        FROM credit_articles ca
        JOIN articles a ON a.id = ca.articles_id
        WHERE ca.stock_item_id IN (SELECT stock_item_id FROM stock_items)
        GROUP BY ca.credit_id
        UNION ALL
        SELECT ca.credit_id,
               SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0))
        FROM credit_articles ca
        JOIN credit c ON c.id = ca.credit_id
        JOIN articles a ON a.id = ca.articles_id
        WHERE c.collector = 'COM001'
          AND c.begin_date >= DATE '2026-05-01' AND c.begin_date < DATE '2026-06-01'
          AND ca.articles_id IN (
              SELECT DISTINCT cmsi.article_id
              FROM commercial_monthly_stock cms
              JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
              WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
          )
        GROUP BY ca.credit_id
    ) s
    GROUP BY credit_id
)
SELECT (SELECT COALESCE(SUM(total_sold_value), 0) FROM stock_items) AS stock_total_sold_value,
       (SELECT COALESCE(SUM(sold_on_stock), 0) FROM merged) AS sum_sold_attributed_to_credits,
       (SELECT COALESCE(SUM(sold_on_stock), 0) FROM merged)
           - (SELECT COALESCE(SUM(total_sold_value), 0) FROM stock_items) AS sur_attribution;

-- =============================================================================
-- 5. Crédits du mois SANS stock_item_id (hors rattrapage RAT-*)
--    Les crédits RAT sont rattachés au stock source via stock_item_id d'un mois antérieur.
-- =============================================================================
SELECT c.id, c.reference, c.type, c.begin_date,
       ca.id AS credit_article_id, ca.articles_id, ca.stock_item_id,
       ca.quantity,
       ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0) AS line_value
FROM credit c
JOIN credit_articles ca ON ca.credit_id = c.id
JOIN articles a ON a.id = ca.articles_id
WHERE c.collector = 'COM001'
  AND c.begin_date >= DATE '2026-05-01' AND c.begin_date < DATE '2026-06-01'
  AND c.reference NOT LIKE 'RAT-%'
  AND ca.articles_id IN (
      SELECT DISTINCT cmsi.article_id
      FROM commercial_monthly_stock cms
      JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
      WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
  )
  AND ca.stock_item_id IS NULL
ORDER BY line_value DESC;

-- =============================================================================
-- 6. Articles dont la somme crédits du mois dépasse total_sold_value du stock item
--    Exclut les crédits RAT-* (rattachés au stock d'un mois antérieur, pas au mois courant).
-- =============================================================================
WITH stock_items AS (
    SELECT cmsi.id, cmsi.article_id, cmsi.total_sold_value,
           a.name,
           CONCAT(a.type, ': ', a.marque, ' ', a.model) AS article_label
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    JOIN articles a ON a.id = cmsi.article_id
    WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
),
credit_lines AS (
    SELECT ca.articles_id,
           SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)) AS credits_month_value
    FROM credit_articles ca
    JOIN credit c ON c.id = ca.credit_id
    JOIN articles a ON a.id = ca.articles_id
    WHERE c.collector = 'COM001'
      AND c.begin_date >= DATE '2026-05-01' AND c.begin_date < DATE '2026-06-01'
      AND c.reference NOT LIKE 'RAT-%'
      AND ca.articles_id IN (SELECT article_id FROM stock_items)
    GROUP BY ca.articles_id
)
SELECT si.id AS stock_item_id,
       si.article_label AS article,
       si.name AS article_name,
       si.total_sold_value,
       cl.credits_month_value,
       cl.credits_month_value - si.total_sold_value AS ecart
FROM stock_items si
JOIN credit_lines cl ON cl.articles_id = si.article_id
WHERE cl.credits_month_value > si.total_sold_value + 1
ORDER BY ecart DESC;

-- =============================================================================
-- 7. Attribution backend (history + stock_item_id) par item du stock cible
--    Colonnes pmp, quantity_sold, pmp_fois_qty_vendue : comparer à total_sold_value
--    (total_sold_value figé à la vente ; pmp × qty = ancienne logique, souvent ≠ après ventes cash)
-- =============================================================================
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id,
           cmsi.total_sold_value,
           cmsi.quantity_sold,
           cmsi.weighted_average_unit_price AS pmp,
           COALESCE(cmsi.quantity_sold, 0)
               * COALESCE(cmsi.weighted_average_unit_price, 0) AS pmp_fois_qty_vendue,
           a.name AS article_name,
           CONCAT(a.type, ': ', a.marque, ' ', a.model) AS article_label
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    JOIN articles a ON a.id = cmsi.article_id
    WHERE cms.collector = 'COM001' AND cms.year = 2026 AND cms.month = 5
),
from_history AS (
    SELECT h.stock_item_id, SUM(h.delta_value) AS valeur
    FROM commercial_monthly_stock_item_sold_value_history h
    WHERE h.stock_item_id IN (SELECT stock_item_id FROM stock_items)
    GROUP BY h.stock_item_id
),
from_stock_item AS (
    SELECT ca.stock_item_id,
           SUM(ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0)) AS valeur
    FROM credit_articles ca
    JOIN articles a ON a.id = ca.articles_id
    WHERE ca.stock_item_id IN (SELECT stock_item_id FROM stock_items)
    GROUP BY ca.stock_item_id
)
SELECT si.stock_item_id,
       si.article_label AS article,
       si.article_name,
       si.pmp,
       si.quantity_sold,
       si.pmp_fois_qty_vendue,
       si.total_sold_value,
       si.total_sold_value - si.pmp_fois_qty_vendue AS ecart_total_vs_pmp_qty,
       COALESCE(fh.valeur, 0) AS via_history,
       COALESCE(fsi.valeur, 0) AS via_stock_item_id,
       GREATEST(COALESCE(fh.valeur, 0), COALESCE(fsi.valeur, 0)) AS attribution_max_source,
       si.total_sold_value - GREATEST(COALESCE(fh.valeur, 0), COALESCE(fsi.valeur, 0)) AS ecart_sous_attribution
FROM stock_items si
LEFT JOIN from_history fh ON fh.stock_item_id = si.stock_item_id
LEFT JOIN from_stock_item fsi ON fsi.stock_item_id = si.stock_item_id
WHERE GREATEST(COALESCE(fh.valeur, 0), COALESCE(fsi.valeur, 0)) < si.total_sold_value - 1
   OR GREATEST(COALESCE(fh.valeur, 0), COALESCE(fsi.valeur, 0)) > si.total_sold_value + 1
ORDER BY ABS(si.total_sold_value - GREATEST(COALESCE(fh.valeur, 0), COALESCE(fsi.valeur, 0))) DESC;

-- =============================================================================
-- 8. Crédits RAT-* saisis ce mois mais rattachés au stock d'un mois antérieur (normal)
-- =============================================================================
SELECT c.id,
       c.reference,
       c.begin_date,
       ca.stock_item_id,
       linked_stock.month AS stock_month,
       linked_stock.year AS stock_year,
       a.name AS article_name,
       CONCAT(a.type, ': ', a.marque, ' ', a.model) AS article,
       ca.quantity * COALESCE(NULLIF(ca.unit_price, 0), a.selling_price, 0) AS line_value,
       c.total_amount_paid
FROM credit c
JOIN credit_articles ca ON ca.credit_id = c.id
JOIN articles a ON a.id = ca.articles_id
JOIN commercial_monthly_stock_item linked ON linked.id = ca.stock_item_id
JOIN commercial_monthly_stock linked_stock ON linked_stock.id = linked.monthly_stock_id
WHERE c.collector = 'COM001'   -- :collector
  AND c.reference LIKE 'RAT-%'
  AND c.begin_date >= DATE '2026-05-01' AND c.begin_date < DATE '2026-06-01'
  AND (
      linked_stock.month IS DISTINCT FROM EXTRACT(MONTH FROM c.begin_date)::integer
      OR linked_stock.year IS DISTINCT FROM EXTRACT(YEAR FROM c.begin_date)::integer
  )
ORDER BY line_value DESC;

-- =============================================================================
-- 9. Disparité KPI stock vendu vs rapport créances (begin_date)
--    Cas typique validé en prod : COM007 / mai 2026
--    — stock_vendu ≈ ventes liées via stock_item_id + history (inclut RAT-* hors mois)
--    — somme_begin_date = filtre rapport créances (exclut souvent les rattrapages)
--    Remplacer collector / year / month / bornes de date selon le stock ciblé.
-- =============================================================================

-- 9a. KPI stock mensuel
SELECT cms.id AS stock_id,
       cms.collector,
       cms.year,
       cms.month,
       COALESCE(SUM(cmsi.total_sold_value), 0) AS stock_vendu_valeur,
       COALESCE(SUM(cmsi.quantity_remaining * cmsi.weighted_average_unit_price), 0) AS stock_restant_valeur,
       COALESCE(SUM(cmsi.quantity_taken), 0) AS qty_pris,
       COALESCE(SUM(cmsi.quantity_sold), 0) AS qty_vendu,
       COALESCE(SUM(cmsi.quantity_returned), 0) AS qty_retourne,
       COALESCE(SUM(cmsi.quantity_remaining), 0) AS qty_restant
FROM commercial_monthly_stock cms
JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
WHERE cms.collector = 'COM007'
  AND cms.year = 2026
  AND cms.month = 5
GROUP BY cms.id, cms.collector, cms.year, cms.month;

-- 9b. Crédits liés au stock (history + stock_item_id, merge MAX comme le backend)
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
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
SELECT COUNT(*) AS nb_credits_lies,
       COALESCE(SUM(l.sold_on_stock), 0) AS somme_sold_on_stock,
       COALESCE(SUM(c.total_amount), 0) AS somme_total_amount_credits,
       COALESCE(SUM(c.total_amount_paid), 0) AS somme_paye,
       COALESCE(SUM(c.total_amount_remaining), 0) AS somme_restant
FROM linked l
JOIN credit c ON c.id = l.credit_id;

-- 9c. Crédits filtrés begin_date du mois (périmètre rapport date)
SELECT COUNT(*) AS nb_credits_begin_mois,
       COALESCE(SUM(c.total_amount), 0) AS somme_total_amount,
       COALESCE(SUM(c.total_amount_paid), 0) AS somme_paye,
       COALESCE(SUM(c.total_amount_remaining), 0) AS somme_restant
FROM credit c
WHERE c.collector = 'COM007'
  AND c.begin_date >= DATE '2026-05-01'
  AND c.begin_date <  DATE '2026-06-01'
  AND c.reference NOT LIKE 'RAT-%';

-- 9d. Synthèse des 3 périmètres
WITH stock AS (
    SELECT COALESCE(SUM(cmsi.total_sold_value), 0) AS stock_vendu
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
),
stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
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
),
linked_sum AS (
    SELECT COALESCE(SUM(l.sold_on_stock), 0) AS somme_sold_on_stock,
           COALESCE(SUM(c.total_amount), 0) AS somme_total_amount_lies
    FROM linked l
    JOIN credit c ON c.id = l.credit_id
),
begin_mois AS (
    SELECT COALESCE(SUM(c.total_amount), 0) AS somme_begin_mois
    FROM credit c
    WHERE c.collector = 'COM007'
      AND c.begin_date >= DATE '2026-05-01'
      AND c.begin_date <  DATE '2026-06-01'
      AND c.reference NOT LIKE 'RAT-%'
)
SELECT s.stock_vendu,
       ls.somme_sold_on_stock,
       ls.somme_total_amount_lies,
       bm.somme_begin_mois,
       s.stock_vendu - ls.somme_sold_on_stock AS ecart_kpi_vs_attribution,
       s.stock_vendu - bm.somme_begin_mois AS ecart_kpi_vs_rapport_begin_date,
       ls.somme_total_amount_lies - bm.somme_begin_mois AS ecart_lies_vs_begin_date
FROM stock s, linked_sum ls, begin_mois bm;

-- 9e. Liés au stock mais hors begin_date du mois (souvent RAT-* mois suivant)
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
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
SELECT c.id,
       c.reference,
       c.type,
       c.status,
       c.begin_date,
       c.total_amount,
       l.sold_on_stock,
       CONCAT(cl.firstname, ' ', cl.lastname) AS client_name
FROM linked l
JOIN credit c ON c.id = l.credit_id
JOIN client cl ON cl.id = c.client_id
WHERE c.begin_date < DATE '2026-05-01'
   OR c.begin_date >= DATE '2026-06-01'
   OR c.reference LIKE 'RAT-%'
ORDER BY l.sold_on_stock DESC;

-- 9f. begin_date du mois mais non liés au stock (sous-attribution / autre mois)
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
),
linked_ids AS (
    SELECT DISTINCT credit_id
    FROM (
        SELECT h.credit_id
        FROM commercial_monthly_stock_item_sold_value_history h
        WHERE h.stock_item_id IN (SELECT stock_item_id FROM stock_items)
          AND h.credit_id IS NOT NULL
        UNION
        SELECT ca.credit_id
        FROM credit_articles ca
        WHERE ca.stock_item_id IN (SELECT stock_item_id FROM stock_items)
    ) x
)
SELECT c.id,
       c.reference,
       c.type,
       c.status,
       c.begin_date,
       c.total_amount,
       CONCAT(cl.firstname, ' ', cl.lastname) AS client_name
FROM credit c
JOIN client cl ON cl.id = c.client_id
WHERE c.collector = 'COM007'
  AND c.begin_date >= DATE '2026-05-01'
  AND c.begin_date <  DATE '2026-06-01'
  AND c.reference NOT LIKE 'RAT-%'
  AND c.id NOT IN (SELECT credit_id FROM linked_ids)
ORDER BY c.total_amount DESC;

-- 9g. Rapport PDF / export : toutes les ventes liées au stock mensuel (périmètre KPI)
WITH stock_items AS (
    SELECT cmsi.id AS stock_item_id
    FROM commercial_monthly_stock cms
    JOIN commercial_monthly_stock_item cmsi ON cmsi.monthly_stock_id = cms.id
    WHERE cms.collector = 'COM007' AND cms.year = 2026 AND cms.month = 5
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

