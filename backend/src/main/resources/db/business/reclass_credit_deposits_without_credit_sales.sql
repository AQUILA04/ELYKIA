-- Script métier, hors Flyway (db/business). Ne pas déplacer dans db/migration.
-- Appliqué manuellement sur elykia_prod_db le 2026-10-05 (COM002, COM003, COM011 — année 2026).
--
-- Avant le split crédit / tontine, tous les versements ont été conservés en versement crédit.
-- Pour chaque commercial et chaque année sans vente à crédit (ouvertures = 0) mais avec un
-- versement crédit net positif, ces montants sont reclassés en versement tontine.
-- Le total versé ne change pas : seule la catégorie bouge.
-- Le bilan crédit lit commercial_report_monthly ; le bilan tontine lit daily_commercial_report.

CREATE TEMP TABLE credit_deposit_reclass_targets AS
SELECT
    d.commercial_username,
    EXTRACT(YEAR FROM d.date)::int AS year
FROM daily_commercial_report d
GROUP BY d.commercial_username, EXTRACT(YEAR FROM d.date)
HAVING ABS(COALESCE(SUM(d.credit_sales_amount), 0)) < 0.01
   AND COALESCE(SUM(d.total_credit_amount_deposited), 0) > 0.01;

UPDATE daily_commercial_report d
SET
    total_tontine_amount_deposited = COALESCE(d.total_tontine_amount_deposited, 0)
                                     + COALESCE(d.total_credit_amount_deposited, 0),
    total_credit_amount_deposited = 0,
    date_mod = NOW()
FROM credit_deposit_reclass_targets t
WHERE d.commercial_username = t.commercial_username
  AND EXTRACT(YEAR FROM d.date)::int = t.year
  AND COALESCE(d.total_credit_amount_deposited, 0) <> 0;

UPDATE cash_deposit cd
SET
    tontine_amount = COALESCE(cd.tontine_amount, 0) + COALESCE(cd.credit_amount, 0),
    credit_amount = 0,
    date_mod = NOW()
FROM credit_deposit_reclass_targets t
WHERE cd.commercial_username = t.commercial_username
  AND EXTRACT(YEAR FROM cd.date)::int = t.year
  AND COALESCE(cd.credit_amount, 0) <> 0;

UPDATE commercial_report_monthly m
SET
    total_credit_amount_deposited = COALESCE((
        SELECT SUM(d.total_credit_amount_deposited)
        FROM daily_commercial_report d
        WHERE d.commercial_username = m.commercial_username
          AND EXTRACT(YEAR FROM d.date)::int = m.year
          AND EXTRACT(MONTH FROM d.date)::int = m.month
    ), 0),
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
    SELECT 1
    FROM credit_deposit_reclass_targets t
    WHERE t.commercial_username = m.commercial_username
      AND t.year = m.year
);

UPDATE cash_period_remittance r
SET
    credit_amount = src.credit_amount,
    tontine_amount = src.tontine_amount,
    date_mod = NOW()
FROM (
    SELECT
        cd.remittance_id,
        COALESCE(SUM(cd.credit_amount), 0) AS credit_amount,
        COALESCE(SUM(cd.tontine_amount), 0) AS tontine_amount
    FROM cash_deposit cd
    WHERE cd.remittance_id IN (
        SELECT DISTINCT cd2.remittance_id
        FROM cash_deposit cd2
        JOIN credit_deposit_reclass_targets t
          ON t.commercial_username = cd2.commercial_username
         AND t.year = EXTRACT(YEAR FROM cd2.date)::int
        WHERE cd2.remittance_id IS NOT NULL
    )
    GROUP BY cd.remittance_id
) src
WHERE r.id = src.remittance_id;

DO $$
DECLARE
    affected integer;
BEGIN
    SELECT COUNT(*) INTO affected FROM credit_deposit_reclass_targets;
    RAISE NOTICE 'Reclassement versement crédit → tontine : % couple(s) commercial/année', affected;
END $$;
