-- Rattrapage stock_item_id sur les lignes de vente comptant liées au stock mensuel commercial.

UPDATE credit_articles ca
SET stock_item_id = matched.stock_item_id
FROM (
    SELECT ca_inner.id AS credit_article_id,
           cmsi.id AS stock_item_id
    FROM credit_articles ca_inner
    JOIN credit c ON c.id = ca_inner.credit_id
    JOIN commercial_monthly_stock_item cmsi ON cmsi.article_id = ca_inner.articles_id
    JOIN commercial_monthly_stock cms ON cms.id = cmsi.monthly_stock_id
        AND cms.collector = c.collector
        AND cms.month = EXTRACT(MONTH FROM c.begin_date)::integer
        AND cms.year = EXTRACT(YEAR FROM c.begin_date)::integer
    WHERE ca_inner.stock_item_id IS NULL
      AND ca_inner.visibility = 'ENABLED'
      AND c.type = 'CASH'
      AND c.visibility = 'ENABLED'
) matched
WHERE ca.id = matched.credit_article_id;
