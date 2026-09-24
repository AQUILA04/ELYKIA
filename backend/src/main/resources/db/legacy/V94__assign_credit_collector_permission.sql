-- Permission changement de commercial sur les ventes (liste bulk + fiche crédit).
-- Attribuée aux profils SUPER_ADMIN, ADMIN, GESTIONNAIRE, SECRETARY
-- (jamais PROMOTER / RECOVERY_MANAGER par défaut). Copiée sur les comptes existants.

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_ASSIGN_CREDIT_COLLECTOR', 'ROLE_ASSIGN_CREDIT_COLLECTOR'
WHERE NOT EXISTS (SELECT 1 FROM uperm WHERE permnam = 'ROLE_ASSIGN_CREDIT_COLLECTOR');

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam = 'ROLE_ASSIGN_CREDIT_COLLECTOR'
  AND pr.name IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'SECRETARY')
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam = 'ROLE_ASSIGN_CREDIT_COLLECTOR'
WHERE pr.name IN ('SUPER_ADMIN', 'ADMIN', 'GESTIONNAIRE', 'SECRETARY')
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );
