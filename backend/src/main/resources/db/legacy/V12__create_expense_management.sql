CREATE TABLE IF NOT EXISTS expense_type (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP,
    visibility VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255)
);

INSERT INTO expense_type (reg_user_id, date_reg, visibility, name, code, description)
VALUES 
('SYSTEM', CURRENT_TIMESTAMP, 'ENABLED', 'Approvisionnement', 'APPROVISIONNEMENT', 'Dépenses liées à l''approvisionnement'),
('SYSTEM', CURRENT_TIMESTAMP, 'ENABLED', 'Achat', 'ACHAT', 'Achats divers'),
('SYSTEM', CURRENT_TIMESTAMP, 'ENABLED', 'Salaire', 'SALAIRE', 'Paiement des salaires')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expense (
    id BIGSERIAL PRIMARY KEY,
    reg_user_id VARCHAR(50) NOT NULL,
    date_reg TIMESTAMP NOT NULL,
    mod_user_id VARCHAR(50),
    date_mod TIMESTAMP,
    visibility VARCHAR(255) NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(255),
    reference VARCHAR(255),
    expense_type_id BIGINT NOT NULL,
    CONSTRAINT fk_expense_type FOREIGN KEY (expense_type_id) REFERENCES expense_type(id)
);
