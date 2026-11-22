-- Company Profile & Branding (singleton row id = 1)
-- Independent of Agency management: configures the deployed enterprise identity,
-- color chart (charte graphique), and custom logo with optimistic cache versioning.

CREATE TABLE IF NOT EXISTS public.company_profile (
    id                  BIGINT PRIMARY KEY,
    company_name        VARCHAR(150) NOT NULL,
    short_name          VARCHAR(60),
    tagline             VARCHAR(180),
    address             VARCHAR(255),
    phone               VARCHAR(50),
    email               VARCHAR(150),
    website             VARCHAR(255),
    tax_id              VARCHAR(80),
    primary_color       VARCHAR(7) NOT NULL DEFAULT '#003366',
    secondary_color     VARCHAR(7) NOT NULL DEFAULT '#0095c8',
    accent_color        VARCHAR(7) NOT NULL DEFAULT '#00c2a8',
    sidebar_bg_color    VARCHAR(7) NOT NULL DEFAULT '#ffffff',
    sidebar_text_color  VARCHAR(7) NOT NULL DEFAULT '#1e293b',
    background_color    VARCHAR(7) NOT NULL DEFAULT '#f2f4f8',
    logo_data           BYTEA,
    logo_content_type   VARCHAR(80),
    logo_filename       VARCHAR(255),
    theme_version       BIGINT NOT NULL DEFAULT 1,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by          VARCHAR(100)
);

INSERT INTO public.company_profile (
    id,
    company_name,
    short_name,
    tagline,
    primary_color,
    secondary_color,
    accent_color,
    sidebar_bg_color,
    sidebar_text_color,
    background_color,
    theme_version,
    updated_at,
    updated_by
)
VALUES (
    1,
    'AMENOUVEVE-YAVEH',
    'ELYKIA',
    'Gestion Elykia',
    '#003366',
    '#0095c8',
    '#00c2a8',
    '#ffffff',
    '#1e293b',
    '#f2f4f8',
    1,
    CURRENT_TIMESTAMP,
    'system'
)
ON CONFLICT (id) DO NOTHING;
