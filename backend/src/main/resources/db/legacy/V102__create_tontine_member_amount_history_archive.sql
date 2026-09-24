CREATE TABLE IF NOT EXISTS public.tontine_member_amount_history_archive (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    tontine_member_id BIGINT NOT NULL,
    batch_id VARCHAR(64) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    original_creation_date TIMESTAMP(6) WITHOUT TIME ZONE,
    archived_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    archived_by VARCHAR(100) NOT NULL,
    new_amount DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_tontine_member_amount_history_archive_member 
        FOREIGN KEY (tontine_member_id) REFERENCES public.tontine_member(id) ON DELETE CASCADE,
    CONSTRAINT tontine_member_amount_history_archive_visibility_check 
        CHECK (((visibility)::text = ANY ((ARRAY['ENABLED'::character varying, 'DISABLED'::character varying, 'DELETED'::character varying])::text[])))
);

CREATE INDEX IF NOT EXISTS idx_tontine_amount_hist_arch_member 
    ON public.tontine_member_amount_history_archive(tontine_member_id);
CREATE INDEX IF NOT EXISTS idx_tontine_amount_hist_arch_batch 
    ON public.tontine_member_amount_history_archive(batch_id);
