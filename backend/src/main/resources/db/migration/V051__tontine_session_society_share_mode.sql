-- Réajustement de la part société paramétrable par session : MANDATORY, OPTIONAL ou DISABLED.
-- Session 2026 : obligatoire ; les sessions suivantes démarrent sans réajustement.

ALTER TABLE public.tontine_session ADD COLUMN IF NOT EXISTS society_share_adjustment_mode character varying(20) DEFAULT 'DISABLED';
UPDATE public.tontine_session SET society_share_adjustment_mode = 'DISABLED' WHERE society_share_adjustment_mode IS NULL;
UPDATE public.tontine_session SET society_share_adjustment_mode = 'MANDATORY' WHERE year = 2026;
