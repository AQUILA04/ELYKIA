INSERT INTO parameters (reg_user_id, date_reg, visibility, parkey, parval, pardesc)
SELECT 'SYSTEM', NOW(), 'ENABLED',
       'RESTRICT_UNIT_PRICE_VISIBILITY',
       'true',
       'Activé : le prix unitaire et le montant de ligne sont réservés au gestionnaire et aux profils admin. Désactivé : tous les profils voient les prix unitaires.'
WHERE NOT EXISTS (
    SELECT 1 FROM parameters WHERE parkey = 'RESTRICT_UNIT_PRICE_VISIBILITY'
);
