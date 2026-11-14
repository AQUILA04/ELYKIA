-- Script métier, hors Flyway. Ne pas déplacer dans db/migration.
-- Appliqué manuellement sur elykia_prod_db.
--
-- COM005 : avant le 21/09/2026, uniquement de la tontine. Depuis les ventes à crédit,
-- le dépôt crédit est calé sur le recouvré (51 400). 2 000 sont pris sur le surplus.
-- Le surplus restant et les dépôts sans catégorie passent en tontine.
--
-- COM010 : période du 01/02/2026 au 25/09/2026 seulement. Le dépôt crédit est calé
-- sur le recouvré au 25/09 (2 062 725). L'excédent et le surplus passent en tontine.
-- Les 2 300 recouvrés après le 25/09 restent hors de ce calcul.
--
-- Le montant physique des dépôts ne change pas. Seules les catégories bougent.
-- Puis les rapports journaliers, le rapport mensuel et les remises sont recalculés
-- à partir des dépôts actifs.

BEGIN;

-- Bloque uniquement les dépôts concernés pendant le reclassement.
DO $$
BEGIN
    PERFORM id
      FROM cash_deposit
     WHERE visibility = 'ENABLED'
       AND (
            commercial_username = 'COM005'
            OR (commercial_username = 'COM010'
                AND date >= DATE '2026-02-01'
                AND date <= DATE '2026-09-25')
       )
       FOR UPDATE;
END $$;

DO $$
DECLARE
    com005_sans numeric;
    com005_surplus_avant numeric;
    com005_credit_depuis numeric;
    com005_surplus_depuis numeric;
    com010_sans numeric;
    com010_credit numeric;
    com010_surplus numeric;
BEGIN
    SELECT COALESCE(ROUND(SUM(amount)::numeric, 2), 0)
      INTO com005_sans
      FROM cash_deposit
     WHERE commercial_username = 'COM005'
       AND visibility = 'ENABLED'
       AND date < DATE '2026-09-21'
       AND COALESCE(credit_amount, 0) = 0
       AND COALESCE(tontine_amount, 0) = 0
       AND COALESCE(new_balance_amount, 0) = 0
       AND COALESCE(surplus_amount, 0) = 0;

    SELECT COALESCE(ROUND(SUM(surplus_amount)::numeric, 2), 0)
      INTO com005_surplus_avant
      FROM cash_deposit
     WHERE commercial_username = 'COM005'
       AND visibility = 'ENABLED'
       AND date < DATE '2026-09-21';

    SELECT COALESCE(ROUND(SUM(credit_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(surplus_amount)::numeric, 2), 0)
      INTO com005_credit_depuis, com005_surplus_depuis
      FROM cash_deposit
     WHERE commercial_username = 'COM005'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-09-21';

    SELECT COALESCE(ROUND(SUM(amount)::numeric, 2), 0)
      INTO com010_sans
      FROM cash_deposit
     WHERE commercial_username = 'COM010'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-02-01'
       AND date <= DATE '2026-09-25'
       AND COALESCE(credit_amount, 0) = 0
       AND COALESCE(tontine_amount, 0) = 0
       AND COALESCE(new_balance_amount, 0) = 0
       AND COALESCE(surplus_amount, 0) = 0;

    SELECT COALESCE(ROUND(SUM(credit_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(surplus_amount)::numeric, 2), 0)
      INTO com010_credit, com010_surplus
      FROM cash_deposit
     WHERE commercial_username = 'COM010'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-02-01'
       AND date <= DATE '2026-09-25';

    IF com005_sans <> 9705450 OR com005_surplus_avant <> 109330
       OR com005_credit_depuis <> 49400 OR com005_surplus_depuis <> 422500 THEN
        RAISE EXCEPTION 'Précontrôle COM005 inattendu: sans=%, surplus_avant=%, credit_depuis=%, surplus_depuis=%',
            com005_sans, com005_surplus_avant, com005_credit_depuis, com005_surplus_depuis;
    END IF;

    IF com010_sans <> 1114000 OR com010_credit <> 1064775 OR com010_surplus <> 28075 THEN
        RAISE EXCEPTION 'Précontrôle COM010 inattendu: sans=%, credit=%, surplus=%',
            com010_sans, com010_credit, com010_surplus;
    END IF;
END $$;

-- COM005 avant le crédit : dépôt sans catégorie -> tontine (y compris l'annulation).
UPDATE cash_deposit
   SET tontine_amount = amount,
       credit_amount = 0,
       new_balance_amount = 0,
       surplus_amount = 0,
       date_mod = NOW()
 WHERE commercial_username = 'COM005'
   AND visibility = 'ENABLED'
   AND date < DATE '2026-09-21'
   AND COALESCE(credit_amount, 0) = 0
   AND COALESCE(tontine_amount, 0) = 0
   AND COALESCE(new_balance_amount, 0) = 0
   AND COALESCE(surplus_amount, 0) = 0;

-- COM005 avant le crédit : surplus -> tontine.
UPDATE cash_deposit
   SET tontine_amount = COALESCE(tontine_amount, 0) + surplus_amount,
       surplus_amount = 0,
       date_mod = NOW()
 WHERE commercial_username = 'COM005'
   AND visibility = 'ENABLED'
   AND date < DATE '2026-09-21'
   AND COALESCE(surplus_amount, 0) <> 0;

-- COM005 depuis le crédit : 2 000 de surplus positif réservés en crédit, le reste en tontine.
WITH ranked AS (
    SELECT id,
           surplus_amount::numeric AS surplus_amount,
           SUM(surplus_amount::numeric) OVER (ORDER BY date, id) AS cum
      FROM cash_deposit
     WHERE commercial_username = 'COM005'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-09-21'
       AND surplus_amount > 0
)
UPDATE cash_deposit d
   SET credit_amount = COALESCE(d.credit_amount, 0)
           + LEAST(r.surplus_amount, GREATEST(0, 2000 - (r.cum - r.surplus_amount))),
       tontine_amount = COALESCE(d.tontine_amount, 0)
           + (r.surplus_amount - LEAST(r.surplus_amount, GREATEST(0, 2000 - (r.cum - r.surplus_amount)))),
       surplus_amount = 0,
       date_mod = NOW()
  FROM ranked r
 WHERE d.id = r.id;

-- COM005 : surplus restant (annulation négative) -> tontine.
UPDATE cash_deposit
   SET tontine_amount = COALESCE(tontine_amount, 0) + surplus_amount,
       surplus_amount = 0,
       date_mod = NOW()
 WHERE commercial_username = 'COM005'
   AND visibility = 'ENABLED'
   AND date >= DATE '2026-09-21'
   AND COALESCE(surplus_amount, 0) <> 0;

-- COM010 : les dépôts sans catégorie couvrent d'abord le crédit manquant (997 950), le reste en tontine.
WITH ranked AS (
    SELECT id,
           amount::numeric AS amount,
           SUM(amount::numeric) OVER (ORDER BY date, id) AS cum
      FROM cash_deposit
     WHERE commercial_username = 'COM010'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-02-01'
       AND date <= DATE '2026-09-25'
       AND COALESCE(credit_amount, 0) = 0
       AND COALESCE(tontine_amount, 0) = 0
       AND COALESCE(new_balance_amount, 0) = 0
       AND COALESCE(surplus_amount, 0) = 0
)
UPDATE cash_deposit d
   SET credit_amount = LEAST(r.amount, GREATEST(0, 997950 - (r.cum - r.amount))),
       tontine_amount = r.amount - LEAST(r.amount, GREATEST(0, 997950 - (r.cum - r.amount))),
       new_balance_amount = 0,
       surplus_amount = 0,
       date_mod = NOW()
  FROM ranked r
 WHERE d.id = r.id;

-- COM010 : surplus de la période -> tontine. Le crédit est déjà couvert.
UPDATE cash_deposit
   SET tontine_amount = COALESCE(tontine_amount, 0) + surplus_amount,
       surplus_amount = 0,
       date_mod = NOW()
 WHERE commercial_username = 'COM010'
   AND visibility = 'ENABLED'
   AND date >= DATE '2026-02-01'
   AND date <= DATE '2026-09-25'
   AND COALESCE(surplus_amount, 0) <> 0;

DO $$
DECLARE
    bad_rows integer;
    com005_credit numeric;
    com005_surplus numeric;
    com005_gap numeric;
    com010_credit numeric;
    com010_tontine numeric;
    com010_surplus numeric;
    com010_gap numeric;
BEGIN
    SELECT COUNT(*)
      INTO bad_rows
      FROM cash_deposit
     WHERE visibility = 'ENABLED'
       AND (
            commercial_username = 'COM005'
            OR (commercial_username = 'COM010'
                AND date >= DATE '2026-02-01'
                AND date <= DATE '2026-09-25')
       )
       AND ABS(amount
               - (COALESCE(credit_amount, 0)
                  + COALESCE(tontine_amount, 0)
                  + COALESCE(new_balance_amount, 0)
                  + COALESCE(surplus_amount, 0))) > 0.01;

    SELECT COALESCE(ROUND(SUM(credit_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(surplus_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(ABS(amount
               - (COALESCE(credit_amount, 0) + COALESCE(tontine_amount, 0)
                  + COALESCE(new_balance_amount, 0) + COALESCE(surplus_amount, 0))))::numeric, 2), 0)
      INTO com005_credit, com005_surplus, com005_gap
      FROM cash_deposit
     WHERE commercial_username = 'COM005'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-09-21';

    SELECT COALESCE(ROUND(SUM(credit_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(tontine_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(surplus_amount)::numeric, 2), 0),
           COALESCE(ROUND(SUM(ABS(amount
               - (COALESCE(credit_amount, 0) + COALESCE(tontine_amount, 0)
                  + COALESCE(new_balance_amount, 0) + COALESCE(surplus_amount, 0))))::numeric, 2), 0)
      INTO com010_credit, com010_tontine, com010_surplus, com010_gap
      FROM cash_deposit
     WHERE commercial_username = 'COM010'
       AND visibility = 'ENABLED'
       AND date >= DATE '2026-02-01'
       AND date <= DATE '2026-09-25';

    IF bad_rows <> 0 OR com005_gap <> 0 OR com010_gap <> 0 THEN
        RAISE EXCEPTION 'Catégories incohérentes: lignes=%, écart COM005=%, écart COM010=%',
            bad_rows, com005_gap, com010_gap;
    END IF;

    IF com005_credit <> 51400 OR com005_surplus <> 0 THEN
        RAISE EXCEPTION 'COM005 après partage inattendu: credit=%, surplus=%', com005_credit, com005_surplus;
    END IF;

    IF com010_credit <> 2062725 OR com010_tontine <> 263450 OR com010_surplus <> 0 THEN
        RAISE EXCEPTION 'COM010 après partage inattendu: credit=%, tontine=%, surplus=%',
            com010_credit, com010_tontine, com010_surplus;
    END IF;
END $$;

-- Rapports journaliers : les colonnes de versement suivent les dépôts actifs.
UPDATE daily_commercial_report d
   SET total_amount_deposited = s.montant,
       total_credit_amount_deposited = s.credit,
       total_tontine_amount_deposited = s.tontine,
       total_new_balance_amount_deposited = s.solde,
       total_surplus_amount_deposited = s.surplus,
       date_mod = NOW()
  FROM (
        SELECT commercial_username,
               date,
               ROUND(SUM(amount)::numeric, 2) AS montant,
               ROUND(SUM(COALESCE(credit_amount, 0))::numeric, 2) AS credit,
               ROUND(SUM(COALESCE(tontine_amount, 0))::numeric, 2) AS tontine,
               ROUND(SUM(COALESCE(new_balance_amount, 0))::numeric, 2) AS solde,
               ROUND(SUM(COALESCE(surplus_amount, 0))::numeric, 2) AS surplus
          FROM cash_deposit
         WHERE visibility = 'ENABLED'
           AND (
                commercial_username = 'COM005'
                OR (commercial_username = 'COM010'
                    AND date >= DATE '2026-02-01'
                    AND date <= DATE '2026-09-25')
           )
         GROUP BY commercial_username, date
       ) s
 WHERE d.commercial_username = s.commercial_username
   AND d.date = s.date
   AND d.visibility = 'ENABLED';

-- Rapport mensuel crédit : somme des journées actives.
UPDATE commercial_report_monthly m
   SET total_credit_amount_deposited = COALESCE((
           SELECT ROUND(SUM(d.total_credit_amount_deposited)::numeric, 2)
             FROM daily_commercial_report d
            WHERE d.commercial_username = m.commercial_username
              AND d.visibility = 'ENABLED'
              AND EXTRACT(YEAR FROM d.date)::int = m.year
              AND EXTRACT(MONTH FROM d.date)::int = m.month
       ), 0),
       updated_at = NOW()
 WHERE m.commercial_username = 'COM005'
    OR (m.commercial_username = 'COM010' AND m.year = 2026 AND m.month BETWEEN 2 AND 9);

-- Remises : catégories recalculées sur tous les dépôts liés, montant physique inchangé.
UPDATE cash_period_remittance r
   SET credit_amount = src.credit,
       tontine_amount = src.tontine,
       new_balance_amount = src.solde,
       date_mod = NOW()
  FROM (
        SELECT cd.remittance_id,
               ROUND(SUM(COALESCE(cd.credit_amount, 0))::numeric, 2) AS credit,
               ROUND(SUM(COALESCE(cd.tontine_amount, 0))::numeric, 2) AS tontine,
               ROUND(SUM(COALESCE(cd.new_balance_amount, 0))::numeric, 2) AS solde
          FROM cash_deposit cd
         WHERE cd.visibility = 'ENABLED'
           AND cd.remittance_id IS NOT NULL
           AND cd.remittance_id IN (
                SELECT DISTINCT remittance_id
                  FROM cash_deposit
                 WHERE remittance_id IS NOT NULL
                   AND visibility = 'ENABLED'
                   AND (
                        commercial_username = 'COM005'
                        OR (commercial_username = 'COM010'
                            AND date >= DATE '2026-02-01'
                            AND date <= DATE '2026-09-25')
                   )
           )
         GROUP BY cd.remittance_id
       ) src
 WHERE r.id = src.remittance_id;

COMMIT;

-- Complément appliqué juste après : le 28/03/2026, le rapport de COM005 portait
-- 53 400 en versement crédit sans dépôt actif. Avant les ventes à crédit, ce montant
-- est de la tontine. Le rapport de mars est recalculé.
BEGIN;

UPDATE daily_commercial_report
   SET total_credit_amount_deposited = 0,
       total_tontine_amount_deposited = COALESCE(total_tontine_amount_deposited, 0) + total_credit_amount_deposited,
       date_mod = NOW()
 WHERE commercial_username = 'COM005'
   AND visibility = 'ENABLED'
   AND date = DATE '2026-03-28'
   AND ROUND(total_credit_amount_deposited::numeric, 2) = 53400
   AND NOT EXISTS (
        SELECT 1 FROM cash_deposit c
         WHERE c.commercial_username = 'COM005'
           AND c.date = DATE '2026-03-28'
           AND c.visibility = 'ENABLED'
   );

UPDATE commercial_report_monthly m
   SET total_credit_amount_deposited = COALESCE((
           SELECT ROUND(SUM(d.total_credit_amount_deposited)::numeric, 2)
             FROM daily_commercial_report d
            WHERE d.commercial_username = m.commercial_username
              AND d.visibility = 'ENABLED'
              AND EXTRACT(YEAR FROM d.date)::int = m.year
              AND EXTRACT(MONTH FROM d.date)::int = m.month
       ), 0),
       updated_at = NOW()
 WHERE m.commercial_username = 'COM005'
   AND m.year = 2026
   AND m.month = 3;

COMMIT;
