-- Création de la table pour stocker les reliquats des clients
CREATE TABLE IF NOT EXISTS client_reliquats (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_recovery_id VARCHAR(255),
    last_accounted_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_client_reliquat_client FOREIGN KEY (client_id) REFERENCES client(id),
    CONSTRAINT uk_client_reliquat_client UNIQUE (client_id)
);

-- Ajout des champs reliquat à la table credit_timeline (recouvrements)
ALTER TABLE credit_timeline
ADD COLUMN IF NOT EXISTS reliquat_generated_amount DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS reliquat_used_amount DOUBLE PRECISION DEFAULT 0.0;

-- Ajout du champ reliquat au rapport journalier
ALTER TABLE daily_commercial_report
ADD COLUMN IF NOT EXISTS total_reliquat_amount DOUBLE PRECISION DEFAULT 0.0;
