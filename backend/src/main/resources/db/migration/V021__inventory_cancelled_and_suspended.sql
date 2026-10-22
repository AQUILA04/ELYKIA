-- Annulation d'un brouillon et suspension d'un inventaire ouvert.

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_status_check;

ALTER TABLE public.inventory
    ADD CONSTRAINT inventory_status_check CHECK (((status)::text = ANY (ARRAY[
        ('DRAFT'::character varying)::text,
        ('IN_PROGRESS'::character varying)::text,
        ('COMPLETED'::character varying)::text,
        ('RECONCILED'::character varying)::text,
        ('CANCELLED'::character varying)::text,
        ('SUSPENDED'::character varying)::text
    ])));
