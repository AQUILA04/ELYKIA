-- Mise journalière constatée sur un mois encore sans cotisation.
-- Null lorsque le carnet reprend la mise déjà en vigueur.
ALTER TABLE public.tontine_member_field_control_line
    ADD COLUMN declared_daily_amount double precision;
