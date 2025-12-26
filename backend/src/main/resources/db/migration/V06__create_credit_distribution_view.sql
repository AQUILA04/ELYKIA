CREATE OR REPLACE VIEW credit_distribution_view AS
SELECT
    parent.id AS credit_parent_id,
    parent.reference AS parent_reference,
    art.id AS article_id,
    art.name AS article_name,
    art.marque AS brand,
    art.model AS model,
    ca_parent.quantity AS parent_quantity,
    COALESCE(dist.distributed_quantity, 0) AS distributed_quantity,
    (ca_parent.quantity - COALESCE(dist.distributed_quantity, 0)) AS undistributed_quantity
FROM
    credit parent
        INNER JOIN
    credit_articles ca_parent ON parent.id = ca_parent.credit_id AND ca_parent.visibility = 'ENABLED'
        INNER JOIN
    articles art ON ca_parent.articles_id = art.id AND art.visibility = 'ENABLED'
        LEFT JOIN
    (
        SELECT
            c.parent_id,
            ca.articles_id,
            SUM(ca.quantity) AS distributed_quantity
        FROM
            credit c
                INNER JOIN
            credit_articles ca ON c.id = ca.credit_id AND ca.visibility = 'ENABLED'
        WHERE
            c.parent_id IS NOT NULL AND c.visibility = 'ENABLED'
        GROUP BY
            c.parent_id,
            ca.articles_id
    ) AS dist ON parent.id = dist.parent_id AND art.id = dist.articles_id
WHERE
    parent.parent_id IS NULL
  AND parent.client_type = 'PROMOTER'
  AND parent.status = 'INPROGRESS'
  AND parent.visibility = 'ENABLED';
