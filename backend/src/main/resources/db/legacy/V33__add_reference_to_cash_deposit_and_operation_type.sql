-- 1. Add reference field to CashDeposit
ALTER TABLE public.cash_deposit ADD COLUMN reference character varying(255);

-- 1.1 Backfill reference for existing cash deposits
UPDATE public.cash_deposit SET reference = 'DEP-' || id WHERE reference IS NULL;

-- 2. Drop and recreate credit_type_check
ALTER TABLE public.credit DROP CONSTRAINT IF EXISTS credit_type_check;
ALTER TABLE public.credit ADD CONSTRAINT credit_type_check CHECK (type IN (
    'CREDIT_COLLECTION',
    'TONTINE_COLLECTION',
    'ORDER',
    'NEW_ACCOUNT',
    'CASH_DEPOSIT',
    'STOCK_RETURN',
    'STOCK_REQUEST',
    'STOCK_TONTINE_REQUEST',
    'STOCK_TONTINE_RETURN',
    'CASH_DEPOSIT_CANCEL',
    'TONTINE_DELIVERY',
    'CREDIT_SALES',
    'NEW_CLIENT',
    'TONTINE_MEMBER_ENROLLMENT',
    'CREDIT',
    'TONTINE',
    'CASH'
));

-- 3. Drop and recreate daily_operation_log_type_check
ALTER TABLE public.daily_operation_log DROP CONSTRAINT IF EXISTS daily_operation_log_type_check;
ALTER TABLE public.daily_operation_log ADD CONSTRAINT daily_operation_log_type_check CHECK (type IN (
    'CREDIT_COLLECTION',
    'TONTINE_COLLECTION',
    'ORDER',
    'NEW_ACCOUNT',
    'CASH_DEPOSIT',
    'STOCK_RETURN',
    'STOCK_REQUEST',
    'STOCK_TONTINE_REQUEST',
    'STOCK_TONTINE_RETURN',
    'CASH_DEPOSIT_CANCEL',
    'TONTINE_DELIVERY',
    'CREDIT_SALES',
    'NEW_CLIENT',
    'TONTINE_MEMBER_ENROLLMENT',
    'CREDIT',
    'TONTINE',
    'CASH'
));
