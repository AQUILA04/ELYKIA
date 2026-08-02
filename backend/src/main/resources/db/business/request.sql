-- la liste des ventes d'une periode et pour un commercial: 
SELECT
    TRIM(CONCAT(cl.firstname, ' ', cl.lastname)) AS client_full_name,
    cl.phone                                      AS client_phone,
    c.reference                                   AS reference_credit,
    c.total_amount                                AS montant_total,
    c.total_amount_paid                           AS montant_total_paye,
    c.total_amount_remaining                      AS montant_total_restant,
    CASE c.status
        WHEN 'INPROGRESS' THEN 'en cours'
        WHEN 'SETTLED'    THEN 'clôturé'
        ELSE c.status
    END                                           AS status
FROM credit c
JOIN client cl ON cl.id = c.client_id
WHERE LOWER(c.collector) = LOWER('com007')
  AND c.begin_date BETWEEN DATE '2026-05-25' AND DATE '2026-06-03'
  AND c.visibility <> 'DELETED'
  AND c.status IN ('INPROGRESS', 'SETTLED')
  AND c.type = 'CREDIT'
ORDER BY c.begin_date, c.reference;