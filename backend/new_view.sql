SELECT
    parent.id AS credit_parent_id,
    parent.reference AS reference_parent,
    art.id AS article_id,
    art.name AS article_nom,
    art.marque,
    art.model,
    ca_parent.quantity AS quantite_parent,
    COALESCE(SUM(ca_child.quantity), 0) AS quantite_distribuee,
    (ca_parent.quantity - COALESCE(SUM(ca_child.quantity), 0)) AS quantite_non_distribuee
FROM
    credit parent
        INNER JOIN
    credit_articles ca_parent ON parent.id = ca_parent.credit_id
        AND ca_parent.visibility = 'ENABLED'
        INNER JOIN
    articles art ON ca_parent.articles_id = art.id
        AND art.visibility = 'ENABLED'
        LEFT JOIN
    credit child ON parent.id = child.parent_id
        AND child.visibility = 'ENABLED'
        LEFT JOIN
    credit_articles ca_child ON child.id = ca_child.credit_id
        AND ca_child.visibility = 'ENABLED'
        AND ca_child.articles_id = art.id
WHERE
    parent.parent_id IS NULL
  AND parent.client_type = 'PROMOTER'
  AND parent.status = 'INPROGRESS'
  AND parent.visibility = 'ENABLED'
GROUP BY
    parent.id, parent.reference, art.id, art.name, art.marque, art.model, ca_parent.quantity
ORDER BY
    parent.id, art.name;