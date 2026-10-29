INSERT INTO parameters (reg_user_id, date_reg, visibility, parkey, parval, pardesc)
SELECT 'SYSTEM', NOW(), 'ENABLED',
       'TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL',
       'false',
       'Activé : un contrôle de carnet terrain marque le membre tontine comme vérifié. Désactivé : seul le contrôle est enregistré.'
WHERE NOT EXISTS (
    SELECT 1 FROM parameters WHERE parkey = 'TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL'
);
