-- Commercial ayant enregistré les collectes contrôlées (ligne de contrôle terrain tontine).
-- Nullable pour conserver les contrôles historiques (agrégat tous commerciaux).

ALTER TABLE public.tontine_member_field_control_line
    ADD COLUMN IF NOT EXISTS commercial_username character varying(100);
