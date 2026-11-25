-- Rapport des membres en échec lors d'un recalcul des parts société (un membre par ligne).
ALTER TABLE public.tontine_allocation_migration_run
    ADD COLUMN IF NOT EXISTS failure_report text;
