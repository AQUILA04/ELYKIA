-- Backfill total_marge_value from commercial_stock_movement margin_amount (cash + credit)

UPDATE commercial_monthly_stock_item cmsi
SET total_marge_value = sub.total_margin
FROM (
    SELECT stock_item_id, COALESCE(SUM(margin_amount), 0) AS total_margin
    FROM commercial_stock_movement
    WHERE movement_type IN ('CASH_SALE', 'CREDIT_SALE')
    GROUP BY stock_item_id
) sub
WHERE cmsi.id = sub.stock_item_id;
