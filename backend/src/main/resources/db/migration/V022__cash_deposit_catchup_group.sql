-- Versement du jour réparti sur les dates de rattrapage tontine.

ALTER TABLE public.cash_deposit
    ADD COLUMN IF NOT EXISTS capture_date date;

ALTER TABLE public.cash_deposit
    ADD COLUMN IF NOT EXISTS deposit_group_id character varying(36);

ALTER TABLE public.cash_deposit
    ADD COLUMN IF NOT EXISTS parent_deposit_id bigint;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_deposit_parent'
    ) THEN
        ALTER TABLE public.cash_deposit
            ADD CONSTRAINT fk_cash_deposit_parent
            FOREIGN KEY (parent_deposit_id) REFERENCES public.cash_deposit (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_deposit_group
    ON public.cash_deposit (deposit_group_id);
