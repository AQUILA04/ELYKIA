BEGIN;
ALTER TABLE tontine_collection
    ADD COLUMN IF NOT EXISTS is_delivery_collection boolean NOT NULL DEFAULT false;
COMMIT;