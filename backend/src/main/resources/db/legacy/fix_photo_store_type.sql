-- =============================================================
-- Migration : Correction du champ 'type' dans photo_store
-- Cause     : PhotoStore.of() ne settait pas le champ 'type',
--             toutes les entrées ont type = NULL en base.
-- Logique   : Pour chaque client_id, le PhotoStore avec le plus
--             petit id = PROFIL, celui avec le plus grand id = CARD.
-- Date      : 2026-06-02
-- =============================================================

BEGIN;

-- Étape 1 : Affecter le type PROFIL au premier PhotoStore de chaque client (id MIN)
UPDATE photo_store
SET type = 'PROFIL'
WHERE id IN (
    SELECT MIN(id)
    FROM photo_store
    WHERE type IS NULL
    GROUP BY client_id
);

-- Étape 2 : Affecter le type CARD au second PhotoStore de chaque client (id MAX)
UPDATE photo_store
SET type = 'CARD'
WHERE id IN (
    SELECT MAX(id)
    FROM photo_store
    WHERE type IS NULL
    GROUP BY client_id
);

-- Vérification : s'assurer qu'il ne reste aucune ligne avec type NULL
DO $$
DECLARE
    remaining INT;
BEGIN
    SELECT COUNT(*) INTO remaining FROM photo_store WHERE type IS NULL;
    IF remaining > 0 THEN
        RAISE EXCEPTION 'Il reste % ligne(s) avec type NULL dans photo_store. Migration incomplète.', remaining;
    END IF;
    RAISE NOTICE 'Migration réussie : tous les enregistrements photo_store ont un type.';
END $$;

COMMIT;
