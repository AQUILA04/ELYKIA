-- Source d'inscription des clients (staff vs auto-inscription Espace Client).
-- Les clients existants restent STAFF via la valeur par défaut.
-- Pas de backfill : le customer-space n'est pas encore en production.

ALTER TABLE public.client
    ADD COLUMN IF NOT EXISTS registration_source VARCHAR(30) NOT NULL DEFAULT 'STAFF';

CREATE INDEX IF NOT EXISTS idx_client_registration_source
    ON public.client (registration_source);
