-- Source d'inscription des membres tontine (staff vs auto-inscription Espace Client).
-- Les membres existants restent STAFF via la valeur par défaut.

ALTER TABLE tontine_member
    ADD COLUMN IF NOT EXISTS registration_source VARCHAR(30) NOT NULL DEFAULT 'STAFF';

CREATE INDEX IF NOT EXISTS idx_tontine_member_registration_source
    ON tontine_member (registration_source);
