-- 1. Alter daily_operation_log to add reliquat columns
ALTER TABLE daily_operation_log
ADD COLUMN reliquat_generated_amount DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN reliquat_used_amount DOUBLE PRECISION DEFAULT 0.0;

-- 2. Update total_reliquat_generated_amount and total_reliquat_used_amount on daily_commercial_report for today (2026-06-01)
UPDATE daily_commercial_report dcr
SET 
  total_reliquat_generated_amount = COALESCE((
    SELECT SUM(ct.reliquat_generated_amount)
    FROM credit_timeline ct
    WHERE CAST(ct.date_reg AS DATE) = '2026-06-01'
      AND ct.collector = dcr.commercial_username
  ), 0.0),
  total_reliquat_used_amount = COALESCE((
    SELECT SUM(ct.reliquat_used_amount)
    FROM credit_timeline ct
    WHERE CAST(ct.date_reg AS DATE) = '2026-06-01'
      AND ct.collector = dcr.commercial_username
  ), 0.0)
WHERE dcr.date = '2026-06-01';

-- 3. Adjust total_amount_to_deposit on daily_commercial_report for today
UPDATE daily_commercial_report
SET total_amount_to_deposit = total_amount_to_deposit + total_reliquat_generated_amount - total_reliquat_used_amount
WHERE date = '2026-06-01'
  AND (total_reliquat_generated_amount > 0.0 OR total_reliquat_used_amount > 0.0);

-- 4. Update reliquat columns in daily_operation_log from credit_timeline for today
UPDATE daily_operation_log dol
SET 
  reliquat_generated_amount = COALESCE((
    SELECT ct.reliquat_generated_amount
    FROM credit_timeline ct
    WHERE dol.description LIKE '%' || ct.reference || '%'
      AND ct.collector = dol.commercial_username
      AND CAST(ct.date_reg AS DATE) = '2026-06-01'
      AND dol.type = 'CREDIT_COLLECTION'
    LIMIT 1
  ), 0.0),
  reliquat_used_amount = COALESCE((
    SELECT ct.reliquat_used_amount
    FROM credit_timeline ct
    WHERE dol.description LIKE '%' || ct.reference || '%'
      AND ct.collector = dol.commercial_username
      AND CAST(ct.date_reg AS DATE) = '2026-06-01'
      AND dol.type = 'CREDIT_COLLECTION'
    LIMIT 1
  ), 0.0)
WHERE dol.date = '2026-06-01'
  AND dol.type = 'CREDIT_COLLECTION';

-- 5. Append reliquat information to description for updated logs today
UPDATE daily_operation_log
SET description = description || ' [Reliquat généré: ' || CAST(reliquat_generated_amount AS INT) || ', utilisé: ' || CAST(reliquat_used_amount AS INT) || ']'
WHERE date = '2026-06-01'
  AND type = 'CREDIT_COLLECTION'
  AND (reliquat_generated_amount > 0.0 OR reliquat_used_amount > 0.0);
