CREATE TABLE IF NOT EXISTS public.tontine_member_amount_history (
    id bigint NOT NULL,
    reg_user_id character varying(50) NOT NULL,
    date_reg timestamp(6) without time zone NOT NULL,
    mod_user_id character varying(50),
    date_mod timestamp(6) without time zone,
    visibility character varying(255) NOT NULL,
    amount double precision NOT NULL,
    creation_date timestamp(6) without time zone NOT NULL,
    end_date date,
    start_date date NOT NULL,
    tontine_member_id bigint NOT NULL,
    CONSTRAINT tontine_member_amount_history_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['ENABLED'::character varying, 'DISABLED'::character varying, 'DELETED'::character varying])::text[])))
);

-- Initialize history for existing members
INSERT INTO tontine_member_amount_history (tontine_member_id, amount, start_date, creation_date, visibility, date_reg, reg_user_id)
SELECT
    tm.id,
    tm.amount,
    ts.start_date,
    NOW(),
    'ENABLED',
    tm.date_reg,
    tm.reg_user_id
FROM tontine_member tm
JOIN tontine_session ts ON tm.tontine_session_id = ts.id;
