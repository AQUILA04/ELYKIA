CREATE TABLE IF NOT EXISTS tontine_member_amount_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tontine_member_id BIGINT NOT NULL,
    amount DOUBLE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    creation_date DATETIME NOT NULL,
    created_by VARCHAR(255),
    created_date DATETIME,
    last_modified_by VARCHAR(255),
    last_modified_date DATETIME,
    state VARCHAR(50),
    CONSTRAINT fk_tontine_member_amount_history_member FOREIGN KEY (tontine_member_id) REFERENCES tontine_member(id)
);

-- Initialize history for existing members
INSERT INTO tontine_member_amount_history (tontine_member_id, amount, start_date, creation_date, state)
SELECT
    tm.id,
    tm.amount,
    ts.start_date,
    NOW(),
    'ENABLED'
FROM tontine_member tm
JOIN tontine_session ts ON tm.tontine_session_id = ts.id;
