-- Backfill credit_sales_margin sur daily_commercial_report.
-- Reproduit le calcul corrigé de CreditService.marginAndBIAggregationOperation :
--   marge = total_amount - coût d'achat effectif
-- avec coût d'achat = total_purchase si > 0, sinon somme des lignes credit_articles
-- (unit_purchase_cost ou purchase_price catalogue).
-- Agrégation par (begin_date, collector), alignée sur CreditStartedEvent / V31.

WITH credit_line_purchase AS (
    SELECT
        ca.credit_id,
        COALESCE(SUM(
            CASE
                WHEN ca.unit_purchase_cost IS NOT NULL AND ca.unit_purchase_cost > 0
                    THEN ca.unit_purchase_cost * ca.quantity
                ELSE COALESCE(a.purchase_price, 0) * ca.quantity
            END
        ), 0) AS calculated_purchase
    FROM credit_articles ca
    JOIN articles a ON a.id = ca.articles_id
    WHERE ca.visibility = 'ENABLED'
    GROUP BY ca.credit_id
),
credit_margin_by_day AS (
    SELECT
        c.begin_date,
        c.collector,
        COALESCE(SUM(
            COALESCE(c.total_amount, 0)
            - COALESCE(
                CASE
                    WHEN c.total_purchase IS NOT NULL AND c.total_purchase > 0
                        THEN c.total_purchase
                    ELSE clp.calculated_purchase
                END,
                0
            )
        ), 0) AS total_margin
    FROM credit c
    LEFT JOIN credit_line_purchase clp ON clp.credit_id = c.id
    WHERE c.visibility = 'ENABLED'
      AND c.type <> 'TONTINE'
      AND c.begin_date IS NOT NULL
      AND c.collector IS NOT NULL
    GROUP BY c.begin_date, c.collector
)
UPDATE daily_commercial_report dcr
SET
    credit_sales_margin = cm.total_margin,
    date_mod = NOW()
FROM credit_margin_by_day cm
WHERE dcr.date = cm.begin_date
  AND dcr.commercial_username = cm.collector
  AND dcr.visibility = 'ENABLED';
