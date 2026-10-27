-- Plusieurs sessions de tontine par année.
-- L'annuelle reste unique par année civile. Les sessions complémentaires ont un code propre.

ALTER TABLE public.tontine_session ADD COLUMN IF NOT EXISTS name character varying(120);
ALTER TABLE public.tontine_session ADD COLUMN IF NOT EXISTS code character varying(40);
ALTER TABLE public.tontine_session ADD COLUMN IF NOT EXISTS kind character varying(20);

UPDATE public.tontine_session
SET name = 'Session annuelle ' || year,
    code = 'ANNUELLE-' || year,
    kind = 'ANNUAL'
WHERE name IS NULL
   OR code IS NULL
   OR kind IS NULL;

ALTER TABLE public.tontine_session ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.tontine_session ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.tontine_session ALTER COLUMN kind SET NOT NULL;

ALTER TABLE public.tontine_session DROP CONSTRAINT IF EXISTS ukg7b9f4xtwknlon44a4websnw9;

ALTER TABLE public.tontine_session DROP CONSTRAINT IF EXISTS uk_tontine_session_code;
ALTER TABLE public.tontine_session
    ADD CONSTRAINT uk_tontine_session_code UNIQUE (code);

ALTER TABLE public.tontine_session DROP CONSTRAINT IF EXISTS tontine_session_kind_check;
ALTER TABLE public.tontine_session
    ADD CONSTRAINT tontine_session_kind_check CHECK ((kind)::text = ANY (ARRAY['ANNUAL'::text, 'EXTRA'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS uk_tontine_session_annual_year
    ON public.tontine_session (year)
    WHERE kind = 'ANNUAL';

CREATE UNIQUE INDEX IF NOT EXISTS uk_tontine_member_client_session_enabled
    ON public.tontine_member (client_id, tontine_session_id)
    WHERE visibility = 'ENABLED';
