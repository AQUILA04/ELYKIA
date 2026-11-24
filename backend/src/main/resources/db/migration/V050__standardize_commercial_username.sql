-- Plan 1 — Uniformisation de l'identifiant du commercial vers commercial_username (Itération N : Expand + Backfill + Sync Trigger).
-- Les colonnes historiques (collector, commercial, commercial_id) sont conservées et synchronisées automatiquement
-- par triggers BEFORE INSERT OR UPDATE jusqu'à leur retrait à l'itération N+1.

-- ============================================================================
-- 1. Fonction trigger générique : collector <-> commercial_username
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_collector_and_commercial_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.commercial_username := COALESCE(NEW.commercial_username, NEW.collector);
        NEW.collector           := COALESCE(NEW.collector, NEW.commercial_username);
    ELSE
        IF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
            NEW.collector := NEW.commercial_username;
        ELSIF NEW.collector IS DISTINCT FROM OLD.collector THEN
            NEW.commercial_username := NEW.collector;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Tables à colonne simple : collector -> commercial_username
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
    is_not_null BOOLEAN;
    simple_tables TEXT[] := ARRAY[
        'commercial_stock_position',
        'commercial_stock_ledger_entry',
        'commercial_stock_period_snapshot',
        'credit_timeline',
        'stock_request',
        'stock_return',
        'commercial_monthly_stock',
        'commercial_stock_movement',
        'stock_tontine_request',
        'stock_tontine_return',
        'tontine_stock_movement',
        'daily_accountancy',
        'cash_sales_register_entry',
        'sales_analytics_daily',
        'collection_analytics_daily',
        'commercial_performance',
        'commercial_performance_monthly'
    ];
BEGIN
    FOREACH tbl IN ARRAY simple_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100)', tbl);
        EXECUTE format('UPDATE public.%I SET commercial_username = collector WHERE commercial_username IS NULL AND collector IS NOT NULL', tbl);

        SELECT (c.is_nullable = 'NO') INTO is_not_null
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = tbl AND c.column_name = 'collector';

        IF is_not_null THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN commercial_username SET NOT NULL', tbl);
        END IF;

        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_commercial_username ON public.%I (commercial_username)',
                       left(tbl, 35), tbl);

        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.%I', tbl);
        EXECUTE format('CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.%I '
                       'FOR EACH ROW EXECUTE FUNCTION public.sync_collector_and_commercial_username()', tbl);
    END LOOP;
END;
$$;

-- ============================================================================
-- 3. Table tontine_stock : commercial <-> commercial_username
-- ============================================================================
ALTER TABLE public.tontine_stock ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);
UPDATE public.tontine_stock SET commercial_username = commercial WHERE commercial_username IS NULL AND commercial IS NOT NULL;
ALTER TABLE public.tontine_stock ALTER COLUMN commercial_username SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tontine_stock_commercial_username ON public.tontine_stock (commercial_username);

CREATE OR REPLACE FUNCTION public.sync_tontine_stock_commercial_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.commercial_username := COALESCE(NEW.commercial_username, NEW.commercial);
        NEW.commercial          := COALESCE(NEW.commercial, NEW.commercial_username);
    ELSE
        IF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
            NEW.commercial := NEW.commercial_username;
        ELSIF NEW.commercial IS DISTINCT FROM OLD.commercial THEN
            NEW.commercial_username := NEW.commercial;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.tontine_stock;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.tontine_stock
    FOR EACH ROW EXECUTE FUNCTION public.sync_tontine_stock_commercial_username();

-- ============================================================================
-- 4. Tables recovery & mobile_transaction : commercial_id <-> commercial_username
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_commercial_id_and_commercial_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.commercial_username := COALESCE(NEW.commercial_username, NEW.commercial_id);
        NEW.commercial_id       := COALESCE(NEW.commercial_id, NEW.commercial_username);
    ELSE
        IF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
            NEW.commercial_id := NEW.commercial_username;
        ELSIF NEW.commercial_id IS DISTINCT FROM OLD.commercial_id THEN
            NEW.commercial_username := NEW.commercial_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE public.recovery ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);
UPDATE public.recovery SET commercial_username = commercial_id WHERE commercial_username IS NULL AND commercial_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recovery_commercial_username ON public.recovery (commercial_username);
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.recovery;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.recovery
    FOR EACH ROW EXECUTE FUNCTION public.sync_commercial_id_and_commercial_username();

ALTER TABLE public.mobile_transaction ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);
UPDATE public.mobile_transaction SET commercial_username = commercial_id WHERE commercial_username IS NULL AND commercial_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mobile_tx_commercial_username ON public.mobile_transaction (commercial_username);
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.mobile_transaction;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.mobile_transaction
    FOR EACH ROW EXECUTE FUNCTION public.sync_commercial_id_and_commercial_username();

-- ============================================================================
-- 5. Table credit : collector <-> commercial_username, agency_commercial <-> agency_commercial_username
-- ============================================================================
ALTER TABLE public.credit ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);
ALTER TABLE public.credit ADD COLUMN IF NOT EXISTS agency_commercial_username VARCHAR(100);
UPDATE public.credit
SET commercial_username        = COALESCE(commercial_username, collector),
    agency_commercial_username = COALESCE(agency_commercial_username, agency_commercial)
WHERE commercial_username IS NULL OR agency_commercial_username IS NULL;
CREATE INDEX IF NOT EXISTS idx_credit_commercial_username ON public.credit (commercial_username);

CREATE OR REPLACE FUNCTION public.sync_credit_commercial_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.commercial_username        := COALESCE(NEW.commercial_username, NEW.collector);
        NEW.collector                  := COALESCE(NEW.collector, NEW.commercial_username);
        NEW.agency_commercial_username := COALESCE(NEW.agency_commercial_username, NEW.agency_commercial);
        NEW.agency_commercial          := COALESCE(NEW.agency_commercial, NEW.agency_commercial_username);
    ELSE
        IF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
            NEW.collector := NEW.commercial_username;
        ELSIF NEW.collector IS DISTINCT FROM OLD.collector THEN
            NEW.commercial_username := NEW.collector;
        END IF;
        IF NEW.agency_commercial_username IS DISTINCT FROM OLD.agency_commercial_username THEN
            NEW.agency_commercial := NEW.agency_commercial_username;
        ELSIF NEW.agency_commercial IS DISTINCT FROM OLD.agency_commercial THEN
            NEW.agency_commercial_username := NEW.agency_commercial;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.credit;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.credit
    FOR EACH ROW EXECUTE FUNCTION public.sync_credit_commercial_username();

-- ============================================================================
-- 6. Tables d'historique : old_collector / new_collector <-> old_commercial_username / new_commercial_username
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_old_new_commercial_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.old_commercial_username := COALESCE(NEW.old_commercial_username, NEW.old_collector);
        NEW.old_collector           := COALESCE(NEW.old_collector, NEW.old_commercial_username);
        NEW.new_commercial_username := COALESCE(NEW.new_commercial_username, NEW.new_collector);
        NEW.new_collector           := COALESCE(NEW.new_collector, NEW.new_commercial_username);
    ELSE
        IF NEW.old_commercial_username IS DISTINCT FROM OLD.old_commercial_username THEN
            NEW.old_collector := NEW.old_commercial_username;
        ELSIF NEW.old_collector IS DISTINCT FROM OLD.old_collector THEN
            NEW.old_commercial_username := NEW.old_collector;
        END IF;
        IF NEW.new_commercial_username IS DISTINCT FROM OLD.new_commercial_username THEN
            NEW.new_collector := NEW.new_commercial_username;
        ELSIF NEW.new_collector IS DISTINCT FROM OLD.new_collector THEN
            NEW.new_commercial_username := NEW.new_collector;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE public.credit_collector_history ADD COLUMN IF NOT EXISTS old_commercial_username VARCHAR(100);
ALTER TABLE public.credit_collector_history ADD COLUMN IF NOT EXISTS new_commercial_username VARCHAR(100);
UPDATE public.credit_collector_history
SET old_commercial_username = COALESCE(old_commercial_username, old_collector),
    new_commercial_username = COALESCE(new_commercial_username, new_collector);
ALTER TABLE public.credit_collector_history ALTER COLUMN old_commercial_username SET NOT NULL;
ALTER TABLE public.credit_collector_history ALTER COLUMN new_commercial_username SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cch_old_commercial_username ON public.credit_collector_history (old_commercial_username);
CREATE INDEX IF NOT EXISTS idx_cch_new_commercial_username ON public.credit_collector_history (new_commercial_username);
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.credit_collector_history;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.credit_collector_history
    FOR EACH ROW EXECUTE FUNCTION public.sync_old_new_commercial_username();

ALTER TABLE public.client_collector_history ADD COLUMN IF NOT EXISTS old_commercial_username VARCHAR(100);
ALTER TABLE public.client_collector_history ADD COLUMN IF NOT EXISTS new_commercial_username VARCHAR(100);
UPDATE public.client_collector_history
SET old_commercial_username = COALESCE(old_commercial_username, old_collector),
    new_commercial_username = COALESCE(new_commercial_username, new_collector);
ALTER TABLE public.client_collector_history ALTER COLUMN new_commercial_username SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clch_old_commercial_username ON public.client_collector_history (old_commercial_username);
CREATE INDEX IF NOT EXISTS idx_clch_new_commercial_username ON public.client_collector_history (new_commercial_username);
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.client_collector_history;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.client_collector_history
    FOR EACH ROW EXECUTE FUNCTION public.sync_old_new_commercial_username();

-- ============================================================================
-- 7. Table client : commercial_username / credit_commercial_username / tontine_ / agency_ / recovery_
-- ============================================================================
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS credit_commercial_username VARCHAR(100);
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS tontine_commercial_username VARCHAR(100);
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS agency_commercial_username VARCHAR(100);
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS recovery_commercial_username VARCHAR(100);

UPDATE public.client
SET commercial_username          = COALESCE(commercial_username, credit_commercial_username, collector),
    credit_commercial_username   = COALESCE(credit_commercial_username, commercial_username, collector),
    tontine_commercial_username  = COALESCE(tontine_commercial_username, tontine_collector),
    agency_commercial_username   = COALESCE(agency_commercial_username, agency_collector),
    recovery_commercial_username = COALESCE(recovery_commercial_username, recovery_collector);

CREATE INDEX IF NOT EXISTS idx_client_commercial_username ON public.client (commercial_username);
CREATE INDEX IF NOT EXISTS idx_client_credit_commercial_username ON public.client (credit_commercial_username);
CREATE INDEX IF NOT EXISTS idx_client_tontine_commercial_username ON public.client (tontine_commercial_username);

CREATE OR REPLACE FUNCTION public.sync_client_commercial_usernames()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.credit_commercial_username   := COALESCE(NEW.credit_commercial_username, NEW.commercial_username, NEW.collector);
        NEW.commercial_username          := COALESCE(NEW.commercial_username, NEW.credit_commercial_username, NEW.collector);
        NEW.collector                    := COALESCE(NEW.collector, NEW.credit_commercial_username);
        NEW.tontine_commercial_username  := COALESCE(NEW.tontine_commercial_username, NEW.tontine_collector);
        NEW.tontine_collector            := COALESCE(NEW.tontine_collector, NEW.tontine_commercial_username);
        NEW.agency_commercial_username   := COALESCE(NEW.agency_commercial_username, NEW.agency_collector);
        NEW.agency_collector             := COALESCE(NEW.agency_collector, NEW.agency_commercial_username);
        NEW.recovery_commercial_username := COALESCE(NEW.recovery_commercial_username, NEW.recovery_collector);
        NEW.recovery_collector           := COALESCE(NEW.recovery_collector, NEW.recovery_commercial_username);
    ELSE
        IF NEW.credit_commercial_username IS DISTINCT FROM OLD.credit_commercial_username THEN
            NEW.collector := NEW.credit_commercial_username;
            NEW.commercial_username := NEW.credit_commercial_username;
        ELSIF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
            NEW.collector := NEW.commercial_username;
            NEW.credit_commercial_username := NEW.commercial_username;
        ELSIF NEW.collector IS DISTINCT FROM OLD.collector THEN
            NEW.credit_commercial_username := NEW.collector;
            NEW.commercial_username := NEW.collector;
        END IF;

        IF NEW.tontine_commercial_username IS DISTINCT FROM OLD.tontine_commercial_username THEN
            NEW.tontine_collector := NEW.tontine_commercial_username;
        ELSIF NEW.tontine_collector IS DISTINCT FROM OLD.tontine_collector THEN
            NEW.tontine_commercial_username := NEW.tontine_collector;
        END IF;

        IF NEW.agency_commercial_username IS DISTINCT FROM OLD.agency_commercial_username THEN
            NEW.agency_collector := NEW.agency_commercial_username;
        ELSIF NEW.agency_collector IS DISTINCT FROM OLD.agency_collector THEN
            NEW.agency_commercial_username := NEW.agency_collector;
        END IF;

        IF NEW.recovery_commercial_username IS DISTINCT FROM OLD.recovery_commercial_username THEN
            NEW.recovery_collector := NEW.recovery_commercial_username;
        ELSIF NEW.recovery_collector IS DISTINCT FROM OLD.recovery_collector THEN
            NEW.recovery_commercial_username := NEW.recovery_collector;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.client;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.client
    FOR EACH ROW EXECUTE FUNCTION public.sync_client_commercial_usernames();

-- ============================================================================
-- 8. Table app_notification : target_collector / tontine_collector
-- ============================================================================
ALTER TABLE public.app_notification ADD COLUMN IF NOT EXISTS target_commercial_username VARCHAR(100);
ALTER TABLE public.app_notification ADD COLUMN IF NOT EXISTS tontine_commercial_username VARCHAR(100);
UPDATE public.app_notification
SET target_commercial_username  = COALESCE(target_commercial_username, target_collector),
    tontine_commercial_username = COALESCE(tontine_commercial_username, tontine_collector);
CREATE INDEX IF NOT EXISTS idx_app_notif_target_commercial_username ON public.app_notification (target_commercial_username);

CREATE OR REPLACE FUNCTION public.sync_app_notification_commercial_usernames()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.target_commercial_username  := COALESCE(NEW.target_commercial_username, NEW.target_collector);
        NEW.target_collector            := COALESCE(NEW.target_collector, NEW.target_commercial_username);
        NEW.tontine_commercial_username := COALESCE(NEW.tontine_commercial_username, NEW.tontine_collector);
        NEW.tontine_collector           := COALESCE(NEW.tontine_collector, NEW.tontine_commercial_username);
    ELSE
        IF NEW.target_commercial_username IS DISTINCT FROM OLD.target_commercial_username THEN
            NEW.target_collector := NEW.target_commercial_username;
        ELSIF NEW.target_collector IS DISTINCT FROM OLD.target_collector THEN
            NEW.target_commercial_username := NEW.target_collector;
        END IF;
        IF NEW.tontine_commercial_username IS DISTINCT FROM OLD.tontine_commercial_username THEN
            NEW.tontine_collector := NEW.tontine_commercial_username;
        ELSIF NEW.tontine_collector IS DISTINCT FROM OLD.tontine_collector THEN
            NEW.tontine_commercial_username := NEW.tontine_collector;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_commercial_username ON public.app_notification;
CREATE TRIGGER trg_sync_commercial_username BEFORE INSERT OR UPDATE ON public.app_notification
    FOR EACH ROW EXECUTE FUNCTION public.sync_app_notification_commercial_usernames();
