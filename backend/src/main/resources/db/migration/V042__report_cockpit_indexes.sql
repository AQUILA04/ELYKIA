-- Index du rapport commerciaux (cockpit, journal, versements, rattrapages saisis).
-- Les requêtes filtrent toutes par plage de dates, parfois par commercial.

-- Journal des opérations : liste paginée et totaux par type sur une période.
CREATE INDEX IF NOT EXISTS idx_daily_operation_log_date_commercial_type
    ON public.daily_operation_log (date, commercial_username, type);

-- Versements d'une période, tous commerciaux ou un seul.
CREATE INDEX IF NOT EXISTS idx_cash_deposit_date_commercial
    ON public.cash_deposit (date, commercial_username);

-- Agrégats équipe sur une période (sans commercial) : l'index existant commence par le commercial.
CREATE INDEX IF NOT EXISTS idx_daily_commercial_report_date
    ON public.daily_commercial_report (date);

-- Rattrapages saisis pendant une période (date de saisie) pour une cotisation hors période.
CREATE INDEX IF NOT EXISTS idx_tontine_collection_date_reg
    ON public.tontine_collection (date_reg)
    WHERE ((visibility)::text = 'ENABLED'::text);
