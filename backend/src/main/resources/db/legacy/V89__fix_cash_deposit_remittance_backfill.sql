-- Corrige le backfill V88 : ne conserver que les versements couverts par chaque remise.
-- 1) Délier les versements enregistrés après la soumission/réception de la remise
UPDATE cash_deposit cd
SET remittance_id = NULL
FROM cash_period_remittance cpr
WHERE cd.remittance_id = cpr.id
  AND cd.date_reg > COALESCE(cpr.submitted_at, cpr.received_at, cpr.date_reg);

-- 2) Délier l'excédent FIFO (garder les plus anciens versements jusqu'au total_amount de la remise)
WITH ranked AS (
    SELECT cd.id,
           cd.amount,
           cpr.total_amount,
           SUM(cd.amount) OVER (
               PARTITION BY cd.remittance_id
               ORDER BY cd.id ASC
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ) AS running_total
    FROM cash_deposit cd
    JOIN cash_period_remittance cpr ON cd.remittance_id = cpr.id
    WHERE cd.amount > 0
      AND cd.remittance_id IS NOT NULL
)
UPDATE cash_deposit cd
SET remittance_id = NULL
FROM ranked r
WHERE cd.id = r.id
  AND (r.running_total - r.amount) >= r.total_amount;
