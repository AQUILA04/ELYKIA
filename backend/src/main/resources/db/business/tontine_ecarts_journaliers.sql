-- Écarts journaliers : daily_commercial_report vs tontine_collection
-- Clé : commercial_username + jour (date rapport = collection_date::date)
-- N'affiche que les jours avec écart (montant ou nombre).
--
-- Réutilisation : modifier le CTE params.
--   month = 0  → toute l'année
--   month = 5  → mai uniquement

WITH params AS (
    SELECT
        'COM003'::text AS commercial,
        2026::int AS year,
        0::int AS month
),
rapport AS (
    SELECT
        d.date AS jour,
        COALESCE(d.tontine_collections_count, 0) AS nb_collectes_rapport,
        ROUND(COALESCE(d.tontine_collections_amount, 0)::numeric, 0) AS montant_rapport
    FROM daily_commercial_report d
    CROSS JOIN params p
    WHERE d.visibility = 'ENABLED'
      AND d.commercial_username = p.commercial
      AND EXTRACT(YEAR FROM d.date) = p.year
      AND (p.month = 0 OR EXTRACT(MONTH FROM d.date) = p.month)
),
collectes AS (
    SELECT
        tc.collection_date::date AS jour,
        COUNT(*) AS nb_collectes_source,
        ROUND(SUM(COALESCE(tc.amount, 0))::numeric, 0) AS montant_source
    FROM tontine_collection tc
    CROSS JOIN params p
    WHERE tc.visibility = 'ENABLED'
      AND tc.commercial_username = p.commercial
      AND EXTRACT(YEAR FROM tc.collection_date) = p.year
      AND (p.month = 0 OR EXTRACT(MONTH FROM tc.collection_date) = p.month)
    GROUP BY tc.collection_date::date
)
SELECT
    COALESCE(r.jour, c.jour) AS jour,
    COALESCE(r.nb_collectes_rapport, 0) AS nb_collectes_rapport,
    COALESCE(r.montant_rapport, 0) AS montant_rapport,
    COALESCE(c.nb_collectes_source, 0) AS nb_collectes_source,
    COALESCE(c.montant_source, 0) AS montant_source,
    COALESCE(r.montant_rapport, 0) - COALESCE(c.montant_source, 0) AS ecart_montant,
    COALESCE(r.nb_collectes_rapport, 0) - COALESCE(c.nb_collectes_source, 0) AS ecart_nb
FROM rapport r
FULL OUTER JOIN collectes c ON r.jour = c.jour
WHERE COALESCE(r.montant_rapport, 0) - COALESCE(c.montant_source, 0) <> 0
   OR COALESCE(r.nb_collectes_rapport, 0) - COALESCE(c.nb_collectes_source, 0) <> 0
ORDER BY jour;
