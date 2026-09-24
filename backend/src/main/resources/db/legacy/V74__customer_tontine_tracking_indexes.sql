CREATE INDEX IF NOT EXISTS idx_tontine_member_client_session
    ON tontine_member (client_id, tontine_session_id);

CREATE INDEX IF NOT EXISTS idx_tontine_collection_member_collection_date
    ON tontine_collection (tontine_member_id, collection_date DESC);
