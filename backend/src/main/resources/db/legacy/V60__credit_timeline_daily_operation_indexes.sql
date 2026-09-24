-- Indexes for daily unrecovered credit queries (operation journalière)
CREATE INDEX IF NOT EXISTS idx_credit_timeline_credit_date_reg
    ON credit_timeline (credit_id, date_reg)
    WHERE visibility = 'ENABLED';

CREATE INDEX IF NOT EXISTS idx_credit_timeline_collector_date_reg
    ON credit_timeline (collector, date_reg)
    WHERE visibility = 'ENABLED';

CREATE INDEX IF NOT EXISTS idx_credit_collector_status_client_type
    ON credit (collector, status, client_type)
    WHERE visibility = 'ENABLED';
