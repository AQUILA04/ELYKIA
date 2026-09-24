-- Bénéficiaire et libellé de référence pour l'historique des mouvements article

ALTER TABLE public.article_history
    ADD COLUMN IF NOT EXISTS beneficiary VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reference_label VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_article_history_reference
    ON public.article_history (reference_type, reference_id);
