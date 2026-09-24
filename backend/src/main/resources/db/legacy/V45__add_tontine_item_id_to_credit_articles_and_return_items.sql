ALTER TABLE public.credit_articles
    ADD COLUMN IF NOT EXISTS tontine_item_id bigint;

ALTER TABLE public.stock_tontine_return_item
    ADD COLUMN IF NOT EXISTS tontine_item_id bigint;

CREATE INDEX IF NOT EXISTS idx_credit_articles_tontine_item_id ON public.credit_articles (tontine_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_tontine_return_item_tontine_item_id ON public.stock_tontine_return_item (tontine_item_id);
