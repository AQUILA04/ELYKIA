-- Corrige les colonnes d'audit si V48 a été appliquée avec created_date/created_by
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'monthly_report_run',
        'monthly_report_file',
        'monthly_report_snapshot',
        'monthly_report_outbox_entry'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = tbl
              AND column_name = 'created_date'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN created_date TO date_reg', tbl);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = tbl
              AND column_name = 'created_by'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN created_by TO reg_user_id', tbl);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = tbl
              AND column_name = 'modified_date'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN modified_date TO date_mod', tbl);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = tbl
              AND column_name = 'modified_by'
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN modified_by TO mod_user_id', tbl);
        END IF;
    END LOOP;
END $$;
