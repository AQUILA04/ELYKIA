-- Aligne tontine_collections_* du rapport journalier sur tontine_collection (ENABLED).
-- Clé : commercial_username + collection_date::date = daily_commercial_report.date
--
-- Actions :
--   1) Aperçu des écarts
--   2) UPDATE des jours déjà présents (hausse / baisse / remise à 0)
--   3) INSERT des jours avec collectes mais sans rapport ENABLED
--
-- Ne touche PAS à total_amount_to_deposit ni aux versements.
--
-- Réutilisation : modifier UNIQUEMENT le INSERT dans _align_params.
-- Après : rejouer tontine_ecarts_mensuels.sql / tontine_ecarts_journaliers.sql.

BEGIN;

DROP TABLE IF EXISTS _align_params;
CREATE TEMP TABLE _align_params (
    commercial text NOT NULL,
    year int NOT NULL,
    month int NOT NULL DEFAULT 0  -- 0 = année entière
);
INSERT INTO _align_params (commercial, year, month) VALUES ('COM010', 2026, 0);

DROP TABLE IF EXISTS _align_source;
CREATE TEMP TABLE _align_source AS
SELECT
    tc.collection_date::date AS jour,
    COUNT(*)::int AS nb,
    COALESCE(SUM(tc.amount), 0)::double precision AS montant
FROM tontine_collection tc
JOIN _align_params p ON TRUE
WHERE tc.visibility = 'ENABLED'
  AND tc.commercial_username = p.commercial
  AND EXTRACT(YEAR FROM tc.collection_date) = p.year
  AND (p.month = 0 OR EXTRACT(MONTH FROM tc.collection_date) = p.month)
GROUP BY tc.collection_date::date;

-- 1) Aperçu avant
SELECT
    COALESCE(d.date, s.jour) AS jour,
    COALESCE(d.tontine_collections_count, 0) AS nb_avant,
    ROUND(COALESCE(d.tontine_collections_amount, 0)::numeric, 0) AS montant_avant,
    COALESCE(s.nb, 0) AS nb_cible,
    ROUND(COALESCE(s.montant, 0)::numeric, 0) AS montant_cible,
    CASE
        WHEN d.id IS NULL THEN 'INSERT'
        ELSE 'UPDATE'
    END AS action
FROM _align_params p
LEFT JOIN daily_commercial_report d
    ON d.commercial_username = p.commercial
   AND d.visibility = 'ENABLED'
   AND EXTRACT(YEAR FROM d.date) = p.year
   AND (p.month = 0 OR EXTRACT(MONTH FROM d.date) = p.month)
FULL OUTER JOIN _align_source s ON s.jour = d.date
WHERE (
        d.id IS NULL
        OR COALESCE(d.tontine_collections_count, 0) <> COALESCE(s.nb, 0)
        OR COALESCE(d.tontine_collections_amount, 0) <> COALESCE(s.montant, 0)
      )
  AND (s.jour IS NOT NULL
       OR COALESCE(d.tontine_collections_count, 0) > 0
       OR COALESCE(d.tontine_collections_amount, 0) > 0)
ORDER BY jour;

-- 2) UPDATE (sous-requêtes : pas de ref cible dans JOIN FROM)
UPDATE daily_commercial_report d
SET
    tontine_collections_count  = COALESCE(
        (SELECT s.nb FROM _align_source s WHERE s.jour = d.date), 0),
    tontine_collections_amount = COALESCE(
        (SELECT s.montant FROM _align_source s WHERE s.jour = d.date), 0),
    date_mod                   = NOW(),
    mod_user_id                = 'script-tontine-align'
FROM _align_params p
WHERE d.visibility = 'ENABLED'
  AND d.commercial_username = p.commercial
  AND EXTRACT(YEAR FROM d.date) = p.year
  AND (p.month = 0 OR EXTRACT(MONTH FROM d.date) = p.month)
  AND (
        COALESCE(d.tontine_collections_count, 0)
            <> COALESCE((SELECT s.nb FROM _align_source s WHERE s.jour = d.date), 0)
     OR COALESCE(d.tontine_collections_amount, 0)
            <> COALESCE((SELECT s.montant FROM _align_source s WHERE s.jour = d.date), 0)
  );

-- 3) INSERT
INSERT INTO daily_commercial_report (
    reg_user_id,
    date_reg,
    visibility,
    commercial_username,
    date,
    tontine_collections_count,
    tontine_collections_amount,
    total_stock_request_amount,
    credit_sales_count,
    credit_sales_amount,
    new_clients_count,
    new_accounts_balance,
    collections_count,
    collections_amount,
    orders_count,
    orders_amount,
    tontine_members_count,
    tontine_deliveries_count,
    tontine_deliveries_amount,
    total_amount_to_deposit,
    total_amount_deposited
)
SELECT
    'script-tontine-align',
    NOW(),
    'ENABLED',
    p.commercial,
    s.jour,
    s.nb,
    s.montant,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
FROM _align_source s
CROSS JOIN _align_params p
WHERE NOT EXISTS (
    SELECT 1
    FROM daily_commercial_report d
    WHERE d.commercial_username = p.commercial
      AND d.date = s.jour
      AND d.visibility = 'ENABLED'
);

-- 4) Contrôle mensuel après
WITH rapport AS (
    SELECT
        EXTRACT(MONTH FROM d.date)::int AS month,
        SUM(COALESCE(d.tontine_collections_count, 0)) AS nb_rapport,
        ROUND(SUM(COALESCE(d.tontine_collections_amount, 0))::numeric, 0) AS montant_rapport
    FROM daily_commercial_report d
    JOIN _align_params p ON d.commercial_username = p.commercial
    WHERE d.visibility = 'ENABLED'
      AND EXTRACT(YEAR FROM d.date) = p.year
    GROUP BY 1
),
collectes AS (
    SELECT
        EXTRACT(MONTH FROM tc.collection_date)::int AS month,
        COUNT(*) AS nb_source,
        ROUND(SUM(COALESCE(tc.amount, 0))::numeric, 0) AS montant_source
    FROM tontine_collection tc
    JOIN _align_params p ON tc.commercial_username = p.commercial
    WHERE tc.visibility = 'ENABLED'
      AND EXTRACT(YEAR FROM tc.collection_date) = p.year
    GROUP BY 1
)
SELECT
    COALESCE(r.month, c.month) AS month,
    COALESCE(r.nb_rapport, 0) AS nb_rapport,
    COALESCE(r.montant_rapport, 0) AS montant_rapport,
    COALESCE(c.nb_source, 0) AS nb_source,
    COALESCE(c.montant_source, 0) AS montant_source,
    COALESCE(r.montant_rapport, 0) - COALESCE(c.montant_source, 0) AS ecart_montant
FROM rapport r
FULL OUTER JOIN collectes c ON r.month = c.month
ORDER BY month;

COMMIT;
