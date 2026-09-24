-- Chef de recouvrement : gestion clients + changement de commercial par défaut
-- (demande métier 2026-08-17). Copié sur le profil et les comptes existants.

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam IN (
    'ROLE_CONSULT_CLIENT',
    'ROLE_EDIT_CLIENT',
    'ROLE_ASSIGN_CLIENT_COLLECTOR',
    'ROLE_ASSIGN_CREDIT_COLLECTOR'
)
  AND pr.name = 'RECOVERY_MANAGER'
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam IN (
    'ROLE_CONSULT_CLIENT',
    'ROLE_EDIT_CLIENT',
    'ROLE_ASSIGN_CLIENT_COLLECTOR',
    'ROLE_ASSIGN_CREDIT_COLLECTOR'
)
WHERE pr.name = 'RECOVERY_MANAGER'
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );
