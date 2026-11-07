-- Script métier, hors Flyway (db/business). Ne pas déplacer dans db/migration.
-- Appliqué manuellement sur elykia_prod_db le 2026-11-08.
--
-- Le 7 novembre 2026, la sync de COM019 a journalisé REC-2026019-BF5594 (2 600 FCFA,
-- reliquat utilisé 500) à 16:40:33, puis la transaction du recouvrement a été annulée
-- (reliquat client introuvable). Le renvoi de 16:53 a créé le seul recouvrement réel.
-- La ligne de 16:40 gonflait le journal et le montant à verser de 2 100 FCFA
-- (2 600 − 500). Le versement de 41 850 déjà enregistré n'est pas modifié.

BEGIN;

DO $$
DECLARE
    phantom_id bigint;
    report_id bigint;
    remaining_bf bigint;
    log_amount numeric;
    log_count int;
    log_used numeric;
    log_generated numeric;
    expected_deposit numeric;
    report daily_commercial_report%ROWTYPE;
BEGIN
    SELECT l.id
      INTO phantom_id
      FROM daily_operation_log l
     WHERE l.id = 84433
       AND l.commercial_username = 'COM019'
       AND l.date = DATE '2026-11-07'
       AND l.type = 'CREDIT_COLLECTION'
       AND l.amount = 2600
       AND l.reliquat_generated_amount = 0
       AND l.reliquat_used_amount = 500
       AND l.visibility = 'ENABLED'
       AND l.description LIKE '%REC-2026019-BF5594%'
       AND l."timestamp" = TIMESTAMP '2026-11-07 16:40:33.896224'
       AND NOT EXISTS (
            SELECT 1
              FROM credit_timeline ct
             WHERE ct.reference = 'REC-2026019-BF5594'
               AND ct.date_reg < TIMESTAMP '2026-11-07 16:50:00'
       );

    IF phantom_id IS NULL THEN
        RAISE NOTICE 'Ligne fantôme 84433 déjà absente ou ne correspond plus : aucune modification.';
    ELSE
        SELECT r.id
          INTO report_id
          FROM daily_commercial_report r
         WHERE r.commercial_username = 'COM019'
           AND r.date = DATE '2026-11-07'
           AND r.visibility = 'ENABLED'
           AND r.collections_count >= 1
           AND r.collections_amount >= 2600
           AND r.total_reliquat_used_amount >= 500
           AND r.total_amount_to_deposit >= 2100;

        IF report_id IS NULL THEN
            RAISE EXCEPTION 'Rapport COM019 du 2026-11-07 introuvable ou déjà inférieur au montant à retirer.';
        END IF;

        DELETE FROM daily_operation_log WHERE id = phantom_id;

        UPDATE daily_commercial_report
           SET collections_count = collections_count - 1,
               collections_amount = collections_amount - 2600,
               total_reliquat_used_amount = total_reliquat_used_amount - 500,
               total_amount_to_deposit = total_amount_to_deposit - 2100,
               mod_user_id = 'SCRIPT',
               date_mod = now()
         WHERE id = report_id;
    END IF;

    SELECT count(*)
      INTO remaining_bf
      FROM daily_operation_log
     WHERE commercial_username = 'COM019'
       AND date = DATE '2026-11-07'
       AND type = 'CREDIT_COLLECTION'
       AND visibility = 'ENABLED'
       AND description LIKE '%REC-2026019-BF5594%';

    IF remaining_bf <> 1 THEN
        RAISE EXCEPTION 'Il doit rester une seule ligne BF5594, trouvé %', remaining_bf;
    END IF;

    SELECT coalesce(sum(amount), 0),
           count(*),
           coalesce(sum(reliquat_used_amount), 0),
           coalesce(sum(reliquat_generated_amount), 0)
      INTO log_amount, log_count, log_used, log_generated
      FROM daily_operation_log
     WHERE commercial_username = 'COM019'
       AND date = DATE '2026-11-07'
       AND type = 'CREDIT_COLLECTION'
       AND visibility = 'ENABLED';

    SELECT * INTO report
      FROM daily_commercial_report
     WHERE commercial_username = 'COM019'
       AND date = DATE '2026-11-07'
       AND visibility = 'ENABLED';

    expected_deposit :=
        coalesce(report.total_advances_amount, 0)
        + coalesce(report.collections_amount, 0)
        + coalesce(report.total_reliquat_generated_amount, 0)
        - coalesce(report.total_reliquat_used_amount, 0)
        + coalesce(report.tontine_collections_amount, 0)
        + coalesce(report.new_accounts_balance, 0);

    IF report.collections_count <> log_count
       OR report.collections_amount <> log_amount
       OR report.total_reliquat_used_amount <> log_used
       OR report.total_reliquat_generated_amount <> log_generated
       OR report.total_amount_to_deposit <> expected_deposit THEN
        RAISE EXCEPTION
            'Rapport incohérent avec le journal : count %/% amount %/% used %/% generated %/% deposit %/%',
            report.collections_count, log_count,
            report.collections_amount, log_amount,
            report.total_reliquat_used_amount, log_used,
            report.total_reliquat_generated_amount, log_generated,
            report.total_amount_to_deposit, expected_deposit;
    END IF;

    RAISE NOTICE 'COM019 2026-11-07 recalé : % recouvrements, % FCFA, à verser %',
        report.collections_count, report.collections_amount, report.total_amount_to_deposit;
END $$;

COMMIT;
