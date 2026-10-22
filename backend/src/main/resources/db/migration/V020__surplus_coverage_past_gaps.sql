-- Couverture d'un manque passé par un surplus, sans modifier le versé du jour cible.

ALTER TABLE public.daily_commercial_report
    ADD COLUMN IF NOT EXISTS surplus_coverage_credit double precision NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surplus_coverage_tontine double precision NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surplus_coverage_new_balance double precision NOT NULL DEFAULT 0;

ALTER TABLE public.cash_surplus_reallocation_line
    ADD COLUMN IF NOT EXISTS target_date date;
