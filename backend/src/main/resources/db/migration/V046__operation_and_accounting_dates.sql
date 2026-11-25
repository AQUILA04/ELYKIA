-- Date d'operation (moment reel de l'operation sur le terrain) et date comptable (journee de caisse)
-- des mises de credit et des cotisations tontine. Prepare les controles de carnet a une borne
-- fiable "jusqu'a la date de controle", sans dependre de l'heure de synchronisation.
-- Les lignes existantes sont retro-remplies avec ce que le systeme sait deja : date d'enregistrement
-- (ou date de cotisation) ; la date comptable est le jour de cette date, sans jointure sur
-- daily_accountancy (couteuse). Operation normale = jour meme ; rattrapage tontine = jour rattrape.

ALTER TABLE public.credit_timeline ADD COLUMN IF NOT EXISTS operation_date timestamp(6) without time zone;
ALTER TABLE public.credit_timeline ADD COLUMN IF NOT EXISTS accounting_date date;

UPDATE public.credit_timeline ct
SET operation_date = COALESCE(ct.operation_date, ct.date_reg),
    accounting_date = COALESCE(ct.accounting_date, CAST(ct.date_reg AS date))
WHERE ct.operation_date IS NULL OR ct.accounting_date IS NULL;

ALTER TABLE public.tontine_collection ADD COLUMN IF NOT EXISTS operation_date timestamp(6) without time zone;
ALTER TABLE public.tontine_collection ADD COLUMN IF NOT EXISTS accounting_date date;

UPDATE public.tontine_collection tc
SET operation_date = COALESCE(tc.operation_date, tc.collection_date),
    accounting_date = COALESCE(tc.accounting_date, CAST(tc.collection_date AS date))
WHERE tc.operation_date IS NULL OR tc.accounting_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_timeline_credit_operation_date
    ON public.credit_timeline (credit_id, operation_date);
CREATE INDEX IF NOT EXISTS idx_tontine_collection_member_operation_date
    ON public.tontine_collection (tontine_member_id, operation_date);
