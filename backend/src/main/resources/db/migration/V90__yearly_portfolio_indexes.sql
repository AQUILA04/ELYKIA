-- Indexes for bilan annuel option B (stock 01/01, créances reçues/cédées, reste live)

-- Holder lookup at as-of date (correlated LIMIT 1 per credit)
CREATE INDEX IF NOT EXISTS idx_cch_credit_change_date
    ON credit_collector_history (credit_id, change_date DESC, id DESC)
    WHERE visibility = 'ENABLED';

-- Créances reçues / cédées (queries use UPPER(collector))
CREATE INDEX IF NOT EXISTS idx_cch_new_collector_change_date
    ON credit_collector_history (UPPER(new_collector), change_date)
    WHERE visibility = 'ENABLED';

CREATE INDEX IF NOT EXISTS idx_cch_old_collector_change_date
    ON credit_collector_history (UPPER(old_collector), change_date)
    WHERE visibility = 'ENABLED';

-- Opening stock eligible set + live remaining modal
CREATE INDEX IF NOT EXISTS idx_credit_enabled_credit_begin_date
    ON credit (begin_date, collector)
    WHERE visibility = 'ENABLED' AND type = 'CREDIT';

CREATE INDEX IF NOT EXISTS idx_credit_live_remaining_by_collector
    ON credit (collector, begin_date DESC, id DESC)
    WHERE visibility = 'ENABLED'
      AND type = 'CREDIT'
      AND total_amount_remaining > 0;

-- Paid-before reconstruction (timeline → daily_accountancy)
CREATE INDEX IF NOT EXISTS idx_credit_timeline_credit_daily_accountancy
    ON credit_timeline (credit_id, daily_accountancy_id)
    WHERE visibility = 'ENABLED';
