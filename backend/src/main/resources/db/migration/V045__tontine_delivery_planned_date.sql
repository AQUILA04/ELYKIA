-- Date de livraison planifiée d'une commande tontine (optionnelle).
-- Sert au PDF des membres à livrer pour une date choisie sur la page des livraisons.

ALTER TABLE public.tontine_delivery ADD COLUMN IF NOT EXISTS planned_delivery_date date;

CREATE INDEX IF NOT EXISTS idx_tontine_delivery_planned_date
    ON public.tontine_delivery (planned_delivery_date)
    WHERE planned_delivery_date IS NOT NULL;
