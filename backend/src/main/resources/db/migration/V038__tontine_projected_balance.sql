ALTER TABLE tontine_delivery ADD COLUMN IF NOT EXISTS projected_balance double precision;
ALTER TABLE tontine_delivery ADD COLUMN IF NOT EXISTS available_at_order double precision;

ALTER TABLE tontine_collection ADD COLUMN IF NOT EXISTS balance_top_up boolean NOT NULL DEFAULT false;
