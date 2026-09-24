-- Recruitment module: job offers and applications

CREATE TABLE IF NOT EXISTS job_offer (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    highlights TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    image_url VARCHAR(1024),
    image_bucket VARCHAR(128),
    image_key VARCHAR(512),
    published_at TIMESTAMP(6) WITHOUT TIME ZONE,
    withdrawn_at TIMESTAMP(6) WITHOUT TIME ZONE,
    display_order INT NOT NULL DEFAULT 0,
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'System',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    CONSTRAINT job_offer_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS idx_job_offer_status_order ON job_offer (status, display_order);
CREATE INDEX IF NOT EXISTS idx_job_offer_visibility ON job_offer (visibility);

CREATE TABLE IF NOT EXISTS job_application (
    id BIGSERIAL PRIMARY KEY,
    job_offer_id BIGINT NOT NULL REFERENCES job_offer (id),
    last_name VARCHAR(120) NOT NULL,
    first_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    birth_date DATE NOT NULL,
    gender VARCHAR(32) NOT NULL,
    locality VARCHAR(255) NOT NULL,
    cv_bucket VARCHAR(128),
    cv_key VARCHAR(512),
    cv_content_type VARCHAR(128),
    cv_file_name VARCHAR(255),
    submitted_at TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    reg_user_id VARCHAR(50) NOT NULL DEFAULT 'System',
    date_reg TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP(6) WITHOUT TIME ZONE,
    visibility VARCHAR(255) NOT NULL DEFAULT 'ENABLED',
    CONSTRAINT job_application_gender_check CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'))
);

CREATE INDEX IF NOT EXISTS idx_job_application_offer_submitted ON job_application (job_offer_id, submitted_at DESC);

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_RECRUITMENT', 'ROLE_RECRUITMENT'
WHERE NOT EXISTS (SELECT 1 FROM uperm WHERE permnam = 'ROLE_RECRUITMENT');

INSERT INTO job_offer (
    title, description, highlights, status, display_order, reg_user_id, date_reg, visibility
) SELECT
    'Aide commerciale',
    'Nous recherchons des aides commerciales passionnées pour accompagner nos commerciaux dans les marchés de Lomé.',
    '["Du lundi au vendredi, 3 jours par semaine","Salaire fixe garanti + primes","Bonne moralité, dynamisme et sens du contact","Âge minimum : 18 ans"]',
    'DRAFT',
    0,
    'System',
    NOW(),
    'ENABLED'
WHERE NOT EXISTS (SELECT 1 FROM job_offer);
