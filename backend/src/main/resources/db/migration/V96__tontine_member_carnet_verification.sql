-- Vérification de carnet tontine (checklist, distincte du contrôle terrain).
-- Flag session-scopé sur le membre + droit dédié (chef de recouvrement par défaut).

ALTER TABLE tontine_member
    ADD COLUMN IF NOT EXISTS carnet_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tontine_member
    ADD COLUMN IF NOT EXISTS carnet_verified_at TIMESTAMP;

ALTER TABLE tontine_member
    ADD COLUMN IF NOT EXISTS carnet_verified_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_tontine_member_session_carnet_verified
    ON tontine_member (tontine_session_id, carnet_verified);

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_TONTINE_CARNET_VERIFY', 'ROLE_TONTINE_CARNET_VERIFY'
WHERE NOT EXISTS (SELECT 1 FROM uperm WHERE permnam = 'ROLE_TONTINE_CARNET_VERIFY');

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam = 'ROLE_TONTINE_CARNET_VERIFY'
  AND pr.name IN ('RECOVERY_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam = 'ROLE_TONTINE_CARNET_VERIFY'
WHERE pr.name IN ('RECOVERY_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );
