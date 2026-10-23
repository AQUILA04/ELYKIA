-- Script métier, hors Flyway (db/business). Ne pas déplacer dans db/migration.
-- Appliqué manuellement sur elykia_prod_db le 2026-10-22.
--
-- L'inventaire 5 (date 2026-07-18, créé par yaskofa) est resté au statut DRAFT.
-- Aucune quantité physique n'a été saisie (77 lignes PENDING).
-- Un inventaire DRAFT ou IN_PROGRESS empêche d'en créer un nouveau.
-- Le passage à COMPLETED ne modifie aucun stock : la clôture SQL ne déclenche
-- ni réconciliation ni ajustement de quantité.

BEGIN;

UPDATE inventory
SET status = 'COMPLETED',
    completed_at = NOW(),
    date_mod = NOW(),
    mod_user_id = 'ops-close-stale-draft'
WHERE id = 5
  AND status = 'DRAFT'
  AND visibility = 'ENABLED'
  AND inventory_date = DATE '2026-07-18'
  AND NOT EXISTS (
      SELECT 1
      FROM inventory_item ii
      WHERE ii.inventory_id = inventory.id
        AND ii.physical_quantity IS NOT NULL
  );

COMMIT;
