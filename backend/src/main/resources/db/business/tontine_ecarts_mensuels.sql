-- Écarts mensuels : daily_commercial_report vs tontine_collection
-- Clé : commercial_username + mois (date rapport / collection_date)
--
-- Réutilisation : modifier uniquement le CTE params.

WITH params AS (
    SELECT
        'COM003'::text AS commercial,
        2026::int AS year
),
rapport AS (
    SELECT
        EXTRACT(YEAR FROM d.date)::int AS year,
        EXTRACT(MONTH FROM d.date)::int AS month,
        COUNT(*) AS nb_jours_rapport,
        SUM(COALESCE(d.tontine_collections_count, 0)) AS nb_collectes_rapport,
        ROUND(SUM(COALESCE(d.tontine_collections_amount, 0))::numeric, 0) AS montant_rapport
    FROM daily_commercial_report d
    CROSS JOIN params p
    WHERE d.visibility = 'ENABLED'
      AND d.commercial_username = p.commercial
      AND EXTRACT(YEAR FROM d.date) = p.year
    GROUP BY 1, 2
),
collectes AS (
    SELECT
        EXTRACT(YEAR FROM tc.collection_date)::int AS year,
        EXTRACT(MONTH FROM tc.collection_date)::int AS month,
        COUNT(*) AS nb_collectes_source,
        ROUND(SUM(COALESCE(tc.amount, 0))::numeric, 0) AS montant_source
    FROM tontine_collection tc
    CROSS JOIN params p
    WHERE tc.visibility = 'ENABLED'
      AND tc.commercial_username = p.commercial
      AND EXTRACT(YEAR FROM tc.collection_date) = p.year
    GROUP BY 1, 2
)
SELECT
    COALESCE(r.year, c.year) AS year,
    COALESCE(r.month, c.month) AS month,
    COALESCE(r.nb_jours_rapport, 0) AS nb_jours_rapport,
    COALESCE(r.nb_collectes_rapport, 0) AS nb_collectes_rapport,
    COALESCE(r.montant_rapport, 0) AS montant_rapport,
    COALESCE(c.nb_collectes_source, 0) AS nb_collectes_source,
    COALESCE(c.montant_source, 0) AS montant_source,
    COALESCE(r.montant_rapport, 0) - COALESCE(c.montant_source, 0) AS ecart_montant,
    COALESCE(r.nb_collectes_rapport, 0) - COALESCE(c.nb_collectes_source, 0) AS ecart_nb
FROM rapport r
FULL OUTER JOIN collectes c
    ON r.year = c.year AND r.month = c.month
ORDER BY year, month;
