-- Détail des membres en échec lors d'un recalcul des parts société (consultable depuis la page d'administration).
CREATE TABLE IF NOT EXISTS public.tontine_allocation_migration_failure (
    id bigserial PRIMARY KEY,
    run_id bigint NOT NULL,
    member_id bigint NOT NULL,
    member_name varchar(255),
    error_type varchar(255),
    message text,
    detail text,
    occurred_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alloc_migration_failure_run
    ON public.tontine_allocation_migration_failure (run_id);
