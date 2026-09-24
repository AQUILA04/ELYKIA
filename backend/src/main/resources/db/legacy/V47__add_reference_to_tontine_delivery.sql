ALTER TABLE public.tontine_delivery
    ADD COLUMN IF NOT EXISTS reference character varying(255);

CREATE UNIQUE INDEX IF NOT EXISTS uk_tontine_delivery_reference ON public.tontine_delivery (reference)
    WHERE reference IS NOT NULL;
