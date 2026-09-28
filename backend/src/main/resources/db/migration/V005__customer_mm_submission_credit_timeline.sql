-- Lie la validation d'une déclaration crédit Espace Client au recouvrement réel (credit_timeline).
ALTER TABLE customer_mobile_money_submission
    ADD COLUMN IF NOT EXISTS validated_by character varying(100),
    ADD COLUMN IF NOT EXISTS validated_at timestamp(6) without time zone,
    ADD COLUMN IF NOT EXISTS credit_timeline_id bigint;

CREATE INDEX IF NOT EXISTS idx_cmm_submission_credit_timeline
    ON customer_mobile_money_submission (credit_timeline_id);
