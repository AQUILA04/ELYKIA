-- Enrichissement article_history pour la trajectoire stock depuis inventaire

ALTER TABLE public.article_history
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS inventory_item_id BIGINT,
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reference_id BIGINT,
    ADD COLUMN IF NOT EXISTS reason VARCHAR(1000);

-- Backfill occurred_at depuis DATE_REG, sinon début de operation_date
UPDATE public.article_history
SET occurred_at = COALESCE(date_reg, operation_date::timestamp)
WHERE occurred_at IS NULL;

ALTER TABLE public.article_history
    ALTER COLUMN occurred_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE public.article_history
SET occurred_at = COALESCE(occurred_at, CURRENT_TIMESTAMP)
WHERE occurred_at IS NULL;

ALTER TABLE public.article_history
    ALTER COLUMN occurred_at SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_article_history_inventory_item'
    ) THEN
        ALTER TABLE public.article_history
            ADD CONSTRAINT fk_article_history_inventory_item
            FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_item(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_article_history_articles_occurred_at
    ON public.article_history (articles_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_article_history_inventory_item_id
    ON public.article_history (inventory_item_id);
