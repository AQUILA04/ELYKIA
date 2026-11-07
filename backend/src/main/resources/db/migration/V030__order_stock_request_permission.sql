-- Droit attribuable : demande de stock depuis une commande.
-- Présent dans le catalogue, sans lien automatique vers un profil.

INSERT INTO uperm (reg_user_id, date_reg, visibility, permnam, permdfltnam)
SELECT 'System', NOW(), 'ENABLED', 'ROLE_ORDER_STOCK_REQUEST', 'ROLE_ORDER_STOCK_REQUEST'
WHERE NOT EXISTS (
    SELECT 1 FROM uperm WHERE permnam = 'ROLE_ORDER_STOCK_REQUEST'
);
