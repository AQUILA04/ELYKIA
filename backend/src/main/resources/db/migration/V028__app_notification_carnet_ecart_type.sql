-- Un écart de carnet crée une notification AppNotificationType.CARNET_ECART.
-- Sans cette valeur, PostgreSQL rejette l'INSERT (app_notification_type_check),
-- la session Hibernate casse, et la synchronisation du contrôle échoue.

ALTER TABLE public.app_notification
    DROP CONSTRAINT IF EXISTS app_notification_type_check;

ALTER TABLE public.app_notification
    ADD CONSTRAINT app_notification_type_check
        CHECK (type IN (
            'PAYMENT_DECLARATION',
            'CUSTOMER_ORDER',
            'TONTINE_CATCHUP',
            'TONTINE_PAYMENT_DECLARATION',
            'CARNET_ECART'
        ));
