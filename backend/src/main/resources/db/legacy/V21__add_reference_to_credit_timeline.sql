-- Add reference column
ALTER TABLE credit_timeline ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- Add unique constraint
-- Note: In PostgreSQL, multiple NULL values are allowed in a UNIQUE column.
-- Existing rows with NULL reference will not violate this constraint.
ALTER TABLE credit_timeline ADD CONSTRAINT uc_credit_timeline_reference UNIQUE (reference);
