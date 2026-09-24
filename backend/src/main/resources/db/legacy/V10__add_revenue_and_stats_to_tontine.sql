ALTER TABLE tontine_member ADD COLUMN IF NOT EXISTS society_share double precision DEFAULT 0;
ALTER TABLE tontine_member ADD COLUMN IF NOT EXISTS available_contribution double precision DEFAULT 0;
ALTER TABLE tontine_member ADD COLUMN IF NOT EXISTS validated_months integer DEFAULT 0;
ALTER TABLE tontine_member ADD COLUMN IF NOT EXISTS current_month_days integer DEFAULT 0;

ALTER TABLE tontine_session ADD COLUMN IF NOT EXISTS total_revenue double precision DEFAULT 0;
