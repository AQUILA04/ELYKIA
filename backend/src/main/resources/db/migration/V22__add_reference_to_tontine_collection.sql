-- Add reference column to tontine_collection
ALTER TABLE tontine_collection ADD COLUMN reference VARCHAR(255);

-- Add unique constraint
-- Note: In PostgreSQL, multiple NULL values are allowed in a UNIQUE column.
-- Existing rows with NULL reference will not violate this constraint.
ALTER TABLE tontine_collection ADD CONSTRAINT uc_tontine_collection_reference UNIQUE (reference);
