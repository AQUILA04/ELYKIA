-- Autoriser CREDIT_COLLECTION_CANCEL dans daily_operation_log.type
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
            'NEW_CLIENT',
            'TONTINE_MEMBER_ENROLLMENT',
            'CREDIT',
            'TONTINE',
            'CASH'
        ));
