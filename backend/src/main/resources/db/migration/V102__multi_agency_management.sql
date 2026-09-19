-- V102: Multi-agency management (DDL + backfill)
-- Decisions: user_id = USERS.USEID; Terrain-only assignments; credit.agency_id;
--            agency.active as business source; BaseEntity audit columns on agency_assignment.

-- =========================================================
-- 1. Enrich agency
-- =========================================================
ALTER TABLE agency
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deactivated_by VARCHAR(255);

-- Ensure codes before unique constraint (nullable/duplicate-safe)
UPDATE agency
SET code = 'LEGACY_' || id::text
WHERE code IS NULL OR TRIM(code) = '';

UPDATE agency a
SET code = a.code || '_' || a.id::text
WHERE EXISTS (
  SELECT 1 FROM agency b
  WHERE b.code = a.code AND b.id < a.id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_agency_code' AND conrelid = 'agency'::regclass
  ) THEN
    ALTER TABLE agency ADD CONSTRAINT uq_agency_code UNIQUE (code);
  END IF;
END$$;

-- Sync active with existing soft-delete visibility
UPDATE agency
SET active = FALSE
WHERE visibility IN ('DISABLED', 'DELETED') AND active = TRUE;

-- =========================================================
-- 2. agency_assignment (user_id = USERS.USEID)
-- =========================================================
CREATE TABLE IF NOT EXISTS agency_assignment (
    id                 BIGSERIAL PRIMARY KEY,
    REG_USER_ID        VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_MIGRATION',
    DATE_REG           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MOD_USER_ID        VARCHAR(50),
    DATE_MOD           TIMESTAMP,
    visibility         VARCHAR(50) NOT NULL DEFAULT 'ENABLED',
    user_id            BIGINT NOT NULL REFERENCES users(useid),
    agency_id          BIGINT NOT NULL REFERENCES agency(id),
    start_date         DATE NOT NULL,
    end_date           DATE,
    assigned_by        VARCHAR(255) NOT NULL,
    notes              TEXT
);

CREATE INDEX IF NOT EXISTS idx_aa_user_end
    ON agency_assignment(user_id, end_date);
CREATE INDEX IF NOT EXISTS idx_aa_agency_active
    ON agency_assignment(agency_id, end_date);

-- =========================================================
-- 3. UserAccount.current_agency_id
-- =========================================================
ALTER TABLE uacc
  ADD COLUMN IF NOT EXISTS current_agency_id BIGINT REFERENCES agency(id);

-- =========================================================
-- 4. agency_id on operational entities (+ credit)
-- =========================================================
ALTER TABLE client                    ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE credit                    ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE recovery                  ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE mobile_transaction        ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE stock_request             ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE stock_return              ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE commercial_monthly_stock  ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE commercial_stock_movement ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE tontine_session           ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE orders                    ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE daily_commercial_report   ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE inventory                 ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE expense                   ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);
ALTER TABLE accounting_day            ADD COLUMN IF NOT EXISTS agency_id BIGINT REFERENCES agency(id);

-- =========================================================
-- 5. Default agency
-- =========================================================
INSERT INTO agency (code, name, active, visibility, reg_user_id, date_reg)
SELECT 'DEFAULT', 'Agence par défaut', TRUE, 'ENABLED', 'SYSTEM_MIGRATION', NOW()
WHERE NOT EXISTS (SELECT 1 FROM agency WHERE code = 'DEFAULT');

-- =========================================================
-- 6. Backfill orphans + Terrain-only assignments
-- =========================================================
DO $$
DECLARE
  default_agency_id BIGINT;
BEGIN
  SELECT id INTO default_agency_id FROM agency WHERE code = 'DEFAULT';

  UPDATE client                    SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE credit                    SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE recovery                  SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE mobile_transaction        SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE stock_request             SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE stock_return              SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE commercial_monthly_stock  SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE commercial_stock_movement SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE tontine_session           SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE orders                    SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE daily_commercial_report   SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE inventory                 SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE expense                   SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE accounting_day            SET agency_id = default_agency_id WHERE agency_id IS NULL;

  -- Keep credit in sync with client when client already had agency (future-safe)
  UPDATE credit c
  SET agency_id = cl.agency_id
  FROM client cl
  WHERE c.client_id = cl.id
    AND cl.agency_id IS NOT NULL
    AND (c.agency_id IS NULL OR c.agency_id IS DISTINCT FROM cl.agency_id);

  -- Profil_Terrain only: PROMOTER, STOREKEEPER, SECRETARY, RECOVERY_MANAGER
  INSERT INTO agency_assignment (
      user_id, agency_id, start_date, assigned_by, notes,
      reg_user_id, date_reg, visibility
  )
  SELECT u.useid, default_agency_id, CURRENT_DATE, 'SYSTEM_MIGRATION',
         'Migration automatique vers agence par défaut (Profil_Terrain)',
         'SYSTEM_MIGRATION', NOW(), 'ENABLED'
  FROM users u
  INNER JOIN uacc a ON a.accid = u.accid
  INNER JOIN upro p ON p.proid = a.proid
  WHERE p.name IN ('PROMOTER', 'STOREKEEPER', 'SECRETARY', 'RECOVERY_MANAGER')
    AND NOT EXISTS (
      SELECT 1 FROM agency_assignment aa
      WHERE aa.user_id = u.useid AND aa.end_date IS NULL
    );

  UPDATE uacc AS a
  SET current_agency_id = default_agency_id
  FROM users u, upro p
  WHERE u.accid = a.accid
    AND p.proid = a.proid
    AND a.current_agency_id IS NULL
    AND p.name IN ('PROMOTER', 'STOREKEEPER', 'SECRETARY', 'RECOVERY_MANAGER');
END$$;

-- =========================================================
-- 7. Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_client_agency        ON client(agency_id);
CREATE INDEX IF NOT EXISTS idx_credit_agency        ON credit(agency_id);
CREATE INDEX IF NOT EXISTS idx_recovery_agency      ON recovery(agency_id);
CREATE INDEX IF NOT EXISTS idx_stock_req_agency     ON stock_request(agency_id);
CREATE INDEX IF NOT EXISTS idx_stock_ret_agency     ON stock_return(agency_id);
CREATE INDEX IF NOT EXISTS idx_tontine_sess_agency  ON tontine_session(agency_id);
CREATE INDEX IF NOT EXISTS idx_daily_report_agency  ON daily_commercial_report(agency_id);
CREATE INDEX IF NOT EXISTS idx_expense_agency       ON expense(agency_id);
CREATE INDEX IF NOT EXISTS idx_accounting_day_agency ON accounting_day(agency_id);
CREATE INDEX IF NOT EXISTS idx_orders_agency        ON orders(agency_id);
CREATE INDEX IF NOT EXISTS idx_inventory_agency     ON inventory(agency_id);
CREATE INDEX IF NOT EXISTS idx_mobile_tx_agency     ON mobile_transaction(agency_id);
CREATE INDEX IF NOT EXISTS idx_cms_agency           ON commercial_monthly_stock(agency_id);
CREATE INDEX IF NOT EXISTS idx_csm_agency           ON commercial_stock_movement(agency_id);
