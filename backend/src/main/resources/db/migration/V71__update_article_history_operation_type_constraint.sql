-- Supprimer l'ancienne contrainte
ALTER TABLE article_history
DROP CONSTRAINT IF EXISTS article_history_operation_type_check;

-- Créer la nouvelle contrainte avec la valeur CANCEL_RECEPTION ajoutée
ALTER TABLE article_history
    ADD CONSTRAINT article_history_operation_type_check
        CHECK (operation_type::text = ANY (ARRAY['ENTREE', 'SORTIE', 'RETURN', 'RESET', 'INVENTORY_ADJUSTMENT', 'CANCEL_RECEPTION']::text[]));
