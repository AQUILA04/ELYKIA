-- Droit de voir la part société prélevée sur la fiche d'un membre tontine.
-- Accordé par défaut aux profils et comptes super admin, admin et gestionnaire déjà existants.

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_VIEW_TONTINE_SOCIETY_SHARE', 'ROLE_VIEW_TONTINE_SOCIETY_SHARE'
WHERE NOT EXISTS (
    SELECT 1 FROM uperm WHERE permnam = 'ROLE_VIEW_TONTINE_SOCIETY_SHARE'
);

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam = 'ROLE_VIEW_TONTINE_SOCIETY_SHARE'
  AND pr.name IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE')
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam = 'ROLE_VIEW_TONTINE_SOCIETY_SHARE'
WHERE pr.name IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE')
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );
