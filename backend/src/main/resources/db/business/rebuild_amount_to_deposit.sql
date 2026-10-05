-- Script métier, hors Flyway (db/business). Ne pas déplacer dans db/migration.
-- Appliqué manuellement sur elykia_prod_db le 2026-10-05.
--
-- Recalcule le montant à verser du rapport journalier pour qu'il égale
-- avances + recouvrements + reliquat généré - reliquat utilisé
-- + collectes tontine + solde des nouveaux comptes.
-- Les versements (total et par catégorie) ne sont pas modifiés.

BEGIN;

CREATE TEMP TABLE _deposit_rebuild AS
SELECT
    d.id,
    d.commercial_username,
    d.date,
    COALESCE(d.total_amount_to_deposit, 0) AS stored,
    (
        COALESCE(d.total_advances_amount, 0)
        + COALESCE(d.collections_amount, 0)
        + COALESCE(d.total_reliquat_generated_amount, 0)
        - COALESCE(d.total_reliquat_used_amount, 0)
        + COALESCE(d.tontine_collections_amount, 0)
        + COALESCE(d.new_accounts_balance, 0)
    ) AS expected
FROM daily_commercial_report d
WHERE d.visibility = 'ENABLED'
  AND ABS(
        COALESCE(d.total_amount_to_deposit, 0)
        - (
            COALESCE(d.total_advances_amount, 0)
            + COALESCE(d.collections_amount, 0)
            + COALESCE(d.total_reliquat_generated_amount, 0)
            - COALESCE(d.total_reliquat_used_amount, 0)
            + COALESCE(d.tontine_collections_amount, 0)
            + COALESCE(d.new_accounts_balance, 0)
        )
      ) > 0.01;

-- Aperçu avant mise à jour
SELECT
    commercial_username,
    COUNT(*) AS jours,
    ROUND(SUM(stored)::numeric, 0) AS a_verser_avant,
    ROUND(SUM(expected)::numeric, 0) AS a_verser_apres,
    ROUND(SUM(expected - stored)::numeric, 0) AS ecart
FROM _deposit_rebuild
GROUP BY commercial_username
ORDER BY commercial_username;

UPDATE daily_commercial_report d
SET
    total_amount_to_deposit = r.expected,
    date_mod = NOW(),
    mod_user_id = 'script-rebuild-amount-to-deposit'
FROM _deposit_rebuild r
WHERE d.id = r.id;

-- Contrôle : plus aucun jour ENABLED en écart
SELECT COUNT(*) AS jours_encore_en_ecart
FROM daily_commercial_report d
WHERE d.visibility = 'ENABLED'
  AND ABS(
        COALESCE(d.total_amount_to_deposit, 0)
        - (
            COALESCE(d.total_advances_amount, 0)
            + COALESCE(d.collections_amount, 0)
            + COALESCE(d.total_reliquat_generated_amount, 0)
            - COALESCE(d.total_reliquat_used_amount, 0)
            + COALESCE(d.tontine_collections_amount, 0)
            + COALESCE(d.new_accounts_balance, 0)
        )
      ) > 0.01;

COMMIT;
