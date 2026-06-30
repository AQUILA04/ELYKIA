ALTER TABLE tontine_collection
    ADD COLUMN IF NOT EXISTS society_share_amount double precision DEFAULT 0;
