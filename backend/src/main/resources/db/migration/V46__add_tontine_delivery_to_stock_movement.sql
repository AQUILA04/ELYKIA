ALTER TABLE public.tontine_stock_movement
    ADD COLUMN IF NOT EXISTS tontine_delivery_id bigint,
    ADD COLUMN IF NOT EXISTS tontine_delivery_reference character varying(255);

CREATE INDEX IF NOT EXISTS idx_tontine_stock_movement_delivery_id ON public.tontine_stock_movement (tontine_delivery_id);
