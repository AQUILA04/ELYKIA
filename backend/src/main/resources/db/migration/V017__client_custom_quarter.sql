-- Zone saisie libre à l'auto-inscription : créée comme localité à la validation du compte.

ALTER TABLE public.client
    ADD COLUMN IF NOT EXISTS custom_quarter BOOLEAN NOT NULL DEFAULT FALSE;
