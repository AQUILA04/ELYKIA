-- Le commercial agence devient un type d'historique, comme le crédit et la tontine.
-- L'index sert la lecture de l'ancien portefeuille (old_collector + type).

ALTER TABLE public.client_collector_history
    DROP CONSTRAINT IF EXISTS client_collector_history_collector_type_check;

ALTER TABLE public.client_collector_history
    ADD CONSTRAINT client_collector_history_collector_type_check
        CHECK (collector_type IN ('CREDIT', 'TONTINE', 'AGENCY'));

CREATE INDEX IF NOT EXISTS idx_client_collector_history_old_collector_type
    ON public.client_collector_history (upper((old_collector)::text), collector_type);
