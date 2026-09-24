-- Mettre à jour le unitPrice pour les StockReturnItem existants
-- en se basant sur le dernier prix unitaire de sortie (StockRequestItem)
-- pour le même article avant la date de retour.

UPDATE stock_return_item sri
SET unit_price = (
    SELECT sri_sub.unit_price
    FROM stock_request_item sri_sub
    JOIN stock_request sr_sub ON sri_sub.stock_request_id = sr_sub.id
    WHERE sri_sub.article_id = sri.article_id
    AND sr_sub.delivery_date <= (SELECT sr.return_date FROM stock_return sr WHERE sr.id = sri.stock_return_id)
    ORDER BY sr_sub.delivery_date DESC, sr_sub.id DESC
    LIMIT 1
)
WHERE sri.unit_price IS NULL OR sri.unit_price = 0;
