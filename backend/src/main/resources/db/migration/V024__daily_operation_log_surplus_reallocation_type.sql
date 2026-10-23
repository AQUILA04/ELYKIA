-- L'équilibrage de surplus journalise OperationType.SURPLUS_REALLOCATION.
-- Sans cette valeur, PostgreSQL rejette l'INSERT (daily_operation_log_type_check)
-- et annule toute l'opération.

ALTER TABLE daily_operation_log
DROP CONSTRAINT IF EXISTS daily_operation_log_type_check;

ALTER TABLE daily_operation_log
    ADD CONSTRAINT daily_operation_log_type_check
        CHECK (type IN (
            'CREDIT_COLLECTION',
            'CREDIT_COLLECTION_CANCEL',
            'TONTINE_COLLECTION',
            'TONTINE_COLLECTION_CANCEL',
            'ORDER',
            'NEW_ACCOUNT',
            'CASH_DEPOSIT',
            'STOCK_RETURN',
            'STOCK_REQUEST',
            'CASH_DEPOSIT_CANCEL',
            'STOCK_TONTINE_REQUEST',
            'STOCK_TONTINE_RETURN',
            'TONTINE_DELIVERY',
            'CREDIT_SALES',
            'CREDIT_SALE_CANCEL',
            'NEW_CLIENT',
            'TONTINE_MEMBER_ENROLLMENT',
            'SURPLUS_REALLOCATION',
            'CREDIT',
            'TONTINE',
            'CASH'
        ));
