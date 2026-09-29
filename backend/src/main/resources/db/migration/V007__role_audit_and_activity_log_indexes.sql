-- Permission ROLE_AUDIT (module Audit — journal espace client)
INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_AUDIT', 'ROLE_AUDIT'
WHERE NOT EXISTS (
    SELECT 1 FROM uperm WHERE permnam = 'ROLE_AUDIT'
);

INSERT INTO upro_perms (permid, proid)
SELECT u.permid, pr.proid
FROM uperm u
CROSS JOIN upro pr
WHERE u.permnam = 'ROLE_AUDIT'
  AND pr.name IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM upro_perms up
      WHERE up.permid = u.permid AND up.proid = pr.proid
  );

INSERT INTO uacc_perms (accid, permid)
SELECT a.accid, u.permid
FROM uacc a
JOIN upro pr ON pr.proid = a.proid
JOIN uperm u ON u.permnam = 'ROLE_AUDIT'
WHERE pr.name IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM uacc_perms ap
      WHERE ap.accid = a.accid AND ap.permid = u.permid
  );

-- Indexes for enriched audit filters
CREATE INDEX IF NOT EXISTS idx_cal_event_type_occurred
    ON customer_activity_log (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_category_occurred
    ON customer_activity_log (category, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_source_occurred
    ON customer_activity_log (source, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_platform_version_occurred
    ON customer_activity_log (platform, app_version, occurred_at DESC);
