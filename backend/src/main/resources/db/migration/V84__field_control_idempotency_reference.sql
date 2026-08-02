-- Idempotency key for field control create (credit + tontine)

ALTER TABLE credit_field_control
    ADD COLUMN IF NOT EXISTS reference VARCHAR(64);

UPDATE credit_field_control
SET reference = 'LEGACY-CFC-' || id::text
WHERE reference IS NULL;

ALTER TABLE credit_field_control
    ALTER COLUMN reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_credit_field_control_reference
    ON credit_field_control (reference);

ALTER TABLE tontine_member_field_control
    ADD COLUMN IF NOT EXISTS reference VARCHAR(64);

UPDATE tontine_member_field_control
SET reference = 'LEGACY-TMFC-' || id::text
WHERE reference IS NULL;

ALTER TABLE tontine_member_field_control
    ALTER COLUMN reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_tontine_member_field_control_reference
    ON tontine_member_field_control (reference);
