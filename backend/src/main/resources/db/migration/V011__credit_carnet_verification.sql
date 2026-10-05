-- Vérification de carnet crédit (checklist, distincte du contrôle terrain).
-- Flag sur la vente + droit dédié (chef de recouvrement par défaut).

ALTER TABLE credit
    ADD COLUMN IF NOT EXISTS carnet_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE credit
    ADD COLUMN IF NOT EXISTS carnet_verified_at TIMESTAMP;

ALTER TABLE credit
    ADD COLUMN IF NOT EXISTS carnet_verified_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_credit_status_carnet_verified
    ON credit (status, carnet_verified);

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_CREDIT_CARNET_VERIFY', 'ROLE_CREDIT_CARNET_VERIFY'
WHERE NOT EXISTS (SELECT 1 FROM uperm WHERE permnam = 'ROLE_CREDIT_CARNET_VERIFY');

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam = 'ROLE_CREDIT_CARNET_VERIFY'
  AND pr.name IN ('RECOVERY_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam = 'ROLE_CREDIT_CARNET_VERIFY'
WHERE pr.name IN ('RECOVERY_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );
