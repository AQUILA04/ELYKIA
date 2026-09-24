-- Indexes for yearly tontine collections and member contribution breakdown.

CREATE INDEX IF NOT EXISTS idx_tontine_collection_commercial_date
    ON tontine_collection (UPPER(commercial_username), collection_date)
    WHERE visibility = 'ENABLED';

CREATE INDEX IF NOT EXISTS idx_tontine_collection_member_commercial
    ON tontine_collection (tontine_member_id, commercial_username)
    WHERE visibility = 'ENABLED';

CREATE INDEX IF NOT EXISTS idx_daily_commercial_report_commercial_date
    ON daily_commercial_report (UPPER(commercial_username), date);
