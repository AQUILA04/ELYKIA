select da.id, da.date_reg, da.visibility, da.accounting_date, da.balance_difference, da.collector, da.real_balance, da.status, da.system_balance, da.daily_accounting_id, u.usefstnam as collector_firstname, u.uselstnam as collector_lastname, u.usephon as collector_phone from daily_accountancy da inner join uacc ua on da.collector = ua.accuser join users u on u.accid = ua.accid;

-- total article distributed
SELECT sum (ca.quantity)
FROM credit parent JOIN credit details ON parent.id = details.parent_credit_id
                   JOIN credit_articles ca ON ca.credit_id = details.id
WHERE ca.articles_id = :articleId AND parent.id = creditId

-- Migration Octobre 2025 --

ALTER TABLE Credit DROP CONSTRAINT credit_status_check;

-- Index sur la colonne 'collector'
CREATE INDEX idx_client_collector ON client (collector);

CREATE INDEX idx_credit_collector ON credit (collector);

-- Index sur la colonne 'client_type'
CREATE INDEX idx_client_client_type ON client (client_type);

CREATE INDEX idx_credit_client_type ON credit (client_type);

-- Index sur la colonne 'collector'
CREATE INDEX idx_credit_status ON client (status);
