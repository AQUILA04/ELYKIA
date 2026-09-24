ALTER TABLE credit DROP CONSTRAINT uc_credit_unique_non_null;

CREATE UNIQUE INDEX uc_credit_unique_non_null
    ON Credit (client_id, type, status, visibility, collector, client_type)
    WHERE client_id IS NOT NULL
AND type IS NOT NULL
AND status IS NOT NULL AND status = 'INPROGRESS'
AND visibility IS NOT NULL
AND collector IS NOT NULL
AND client_type IS NOT NULL AND client_type = 'CLIENT';