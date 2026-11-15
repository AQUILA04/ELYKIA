ALTER TABLE tontine_delivery ADD COLUMN IF NOT EXISTS authenticity_code VARCHAR(20);

UPDATE tontine_delivery
SET authenticity_code = 'ELY-'
    || upper(substr(md5(id::text || random()::text || clock_timestamp()::text), 1, 4))
    || '-'
    || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 4))
WHERE authenticity_code IS NULL;

ALTER TABLE tontine_delivery ALTER COLUMN authenticity_code SET NOT NULL;

ALTER TABLE tontine_delivery
    ADD CONSTRAINT ux_tontine_delivery_authenticity_code UNIQUE (authenticity_code);
