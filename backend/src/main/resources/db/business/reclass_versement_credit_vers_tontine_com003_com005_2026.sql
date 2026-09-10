-- Reclassement 2026 : versement crédit → versement tontine
-- sur daily_commercial_report, pour COM003 et COM005 uniquement.
--
-- Contexte : 0 vente à crédit dans le rapport journalier, mais un versement
-- crédit affiché au bilan annuel. COM002 / COM011 / COM013 volontairement
-- exclus (attente confirmation métier).
--
-- cash_deposit n'est pas modifié (credit_amount déjà à 0 pour ces 2 commerciaux).
-- commercial_report_monthly est resynchronisé ensuite : le bilan annuel crédit
-- de l'app lit cette table, pas le journalier.
--
-- Totaux constatés en prod (2026, visibility = ENABLED) avant correction :
--   COM003 : verse crédit 5 643 400 (68 j)  | verse tontine 1 963 550
--            → après : crédit 0 | tontine 7 606 950
--   COM005 : verse crédit 9 358 400 (70 j)  | verse tontine 5 495 120
--            → après : crédit 0 | tontine 14 853 520
--
-- Idempotent : un 2e passage ne déplace plus rien (versé crédit déjà à 0).

BEGIN;

-- 1) Contrôle avant (ne modifie rien)
SELECT
    commercial_username,
    COUNT(*) FILTER (WHERE COALESCE(total_credit_amount_deposited, 0) > 0) AS nb_jours_a_deplacer,
    ROUND(SUM(COALESCE(total_credit_amount_deposited, 0))::numeric, 0) AS verse_credit,
    ROUND(SUM(COALESCE(total_tontine_amount_deposited, 0))::numeric, 0) AS verse_tontine,
    ROUND(SUM(COALESCE(credit_sales_amount, 0))::numeric, 0) AS ventes_credit
FROM daily_commercial_report
WHERE visibility = 'ENABLED'
  AND commercial_username IN ('COM003', 'COM005')
  AND date >= DATE '2026-01-01'
  AND date <  DATE '2027-01-01'
GROUP BY commercial_username
ORDER BY commercial_username;

-- 2) Déplacement sur le rapport journalier
UPDATE daily_commercial_report
SET
    total_tontine_amount_deposited = COALESCE(total_tontine_amount_deposited, 0)
                                     + COALESCE(total_credit_amount_deposited, 0),
    total_credit_amount_deposited  = 0,
    date_mod                       = NOW()
WHERE visibility = 'ENABLED'
  AND commercial_username IN ('COM003', 'COM005')
  AND date >= DATE '2026-01-01'
  AND date <  DATE '2027-01-01'
  AND COALESCE(total_credit_amount_deposited, 0) > 0
  AND COALESCE(credit_sales_amount, 0) = 0
  AND COALESCE(credit_sales_count, 0) = 0;

-- 3) Resync du mensuel (bilan annuel crédit)
UPDATE commercial_report_monthly m
SET
    total_credit_amount_deposited = src.verse_credit,
    updated_at                    = CURRENT_TIMESTAMP
FROM (
    SELECT
        commercial_username,
        EXTRACT(YEAR  FROM date)::INT AS year,
        EXTRACT(MONTH FROM date)::INT AS month,
        COALESCE(SUM(total_credit_amount_deposited), 0) AS verse_credit
    FROM daily_commercial_report
    WHERE visibility = 'ENABLED'
      AND commercial_username IN ('COM003', 'COM005')
      AND date >= DATE '2026-01-01'
      AND date <  DATE '2027-01-01'
    GROUP BY commercial_username, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
) src
WHERE m.commercial_username = src.commercial_username
  AND m.year  = src.year
  AND m.month = src.month;

-- 4) Contrôle après
SELECT
    commercial_username,
    COUNT(*) FILTER (WHERE COALESCE(total_credit_amount_deposited, 0) > 0) AS nb_jours_encore_credit,
    ROUND(SUM(COALESCE(total_credit_amount_deposited, 0))::numeric, 0) AS verse_credit,
    ROUND(SUM(COALESCE(total_tontine_amount_deposited, 0))::numeric, 0) AS verse_tontine
FROM daily_commercial_report
WHERE visibility = 'ENABLED'
  AND commercial_username IN ('COM003', 'COM005')
  AND date >= DATE '2026-01-01'
  AND date <  DATE '2027-01-01'
GROUP BY commercial_username
ORDER BY commercial_username;

SELECT
    commercial_username,
    ROUND(SUM(COALESCE(total_credit_amount_deposited, 0))::numeric, 0) AS verse_credit_mensuel
FROM commercial_report_monthly
WHERE year = 2026
  AND commercial_username IN ('COM003', 'COM005')
GROUP BY commercial_username
ORDER BY commercial_username;

-- Vérifier les totaux après, puis :
--   COMMIT;
-- ou
--   ROLLBACK;
