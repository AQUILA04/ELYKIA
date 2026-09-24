-- Contraintes CHECK manquantes pour l'annulation de ventes (Flyway souvent désactivé en local).

ALTER TABLE commercial_stock_movement
DROP CONSTRAINT IF EXISTS commercial_stock_movement_movement_type_check;

ALTER TABLE commercial_stock_movement
    ADD CONSTRAINT commercial_stock_movement_movement_type_check
        CHECK (movement_type IN (
            'CREDIT_SALE',
            'CASH_SALE',
            'STOCK_IN',
            'RETURN',
            'ADJUSTMENT',
            'SALE_CANCELLATION'
        ));

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
            'CREDIT',
            'TONTINE',
            'CASH'
        ));

ALTER TABLE credit
DROP CONSTRAINT IF EXISTS credit_status_check;

ALTER TABLE credit
    ADD CONSTRAINT credit_status_check
        CHECK (status IN (
            'CREATED',
            'VALIDATED',
            'INPROGRESS',
            'DELIVERED',
            'ENDED',
            'SETTLED',
            'MERGED',
            'CANCELLED'
        ));
