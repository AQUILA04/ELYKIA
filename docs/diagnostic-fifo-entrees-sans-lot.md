# Contrôle prod — stock magasin sans lot FIFO

Lecture seule. Aucun `UPDATE`, aucun `DELETE`, et ne pas retoucher le paramètre `ENABLED_FIFO_STOCK_VALUATION` pendant ce contrôle : le désactiver est refusé par l’application, et le réactiver relance la création des lots d’ouverture.

But : pour l’article signalé (**CUBE: ONGA quart**, livraison de 5 refusée, message « manque 2 »), reconstituer **qui** a fait **quelle opération**, **à quelle heure**, et si cette opération a créé un lot.

Le message « manque 2 » sur une livraison de 5 signifie qu’au moment du refus, les lots encore ouverts totalisaient **3** unités. Le stock affiché au magasin était plus haut (22 d’après le signalement : 3 avant l’activation, puis +19).

## Connexion

Sur le VPS, uniquement le conteneur Postgres de la prod (`deploy/docker-compose.prod.yml`) :

```bash
docker exec -it elykia-prod-db psql -U elykia_prod -d elykia_prod_db
```

Si le nom a changé : `docker ps --format '{{.Names}}' | grep -E 'db|postgres'`.

Les colonnes `date_reg`, `validated_at`, `occurred_at`, `performed_at` sont des `timestamp without time zone` écrits par l’horloge du serveur (UTC sur Contabo). Pour les lire en heure Maurice, **ajouter 4 heures**. Les exemples ci-dessous ne convertissent pas ces colonnes.

Dans `psql` : `\pset pager off` puis coller les requêtes dans l’ordre. Remplacer rien : la première requête pose `article_id` dans une variable psql.

## 1. Identifier l’article

Le nom affiché est `type || ': ' || marque || ' ' || model`.

```sql
SELECT id,
       type || ': ' || marque || ' ' || model AS nom_affiche,
       stock_quantity,
       purchase_price,
       packaging_type,
       units_per_package,
       last_restock_date,
       visibility
FROM articles
WHERE type ILIKE 'CUBE'
  AND marque ILIKE 'ONGA'
  AND model ILIKE '%quart%';
```

Noter `id`. La suite utilise cette valeur. S’il y a plusieurs lignes, garder celle dont `stock_quantity` correspond au magasin vu à l’écran (22).

```sql
\set article_id 0
```

Remplacer `0` par l’id trouvé.

## 2. Écart stock / lots, maintenant

```sql
SELECT a.stock_quantity AS stock_magasin,
       COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.status = 'OPEN'), 0) AS lots_ouverts,
       a.stock_quantity
         - COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.status = 'OPEN'), 0) AS ecart
FROM articles a
LEFT JOIN article_stock_lot l ON l.article_id = a.id
WHERE a.id = :article_id
GROUP BY a.stock_quantity;
```

L’écart est le nombre d’unités présentes au magasin et absentes des lots encore ouverts. Sur le cas signalé, on attend un écart de **19** (22 − 3) si rien n’a bougé depuis le refus.

Autres articles dans le même état (pour voir si le cas est isolé) :

```sql
SELECT a.id,
       a.type || ': ' || a.marque || ' ' || a.model AS nom_affiche,
       a.stock_quantity,
       COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.status = 'OPEN'), 0) AS lots_ouverts
FROM articles a
LEFT JOIN article_stock_lot l ON l.article_id = a.id
WHERE a.visibility = 'ENABLED'
GROUP BY a.id
HAVING a.stock_quantity
     IS DISTINCT FROM COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.status = 'OPEN'), 0)
ORDER BY ABS(a.stock_quantity
     - COALESCE(SUM(l.quantity_remaining) FILTER (WHERE l.status = 'OPEN'), 0)) DESC;
```

## 3. Heure d’activation du FIFO

Le lot `MIGRATION` est écrit au moment où le paramètre passe à vrai. Son `date_reg` est l’heure d’activation **pour cet article**. `parameters.date_mod` est la dernière modification de la ligne (une édition de description ultérieure la décale) : s’en servir seulement en secours.

```sql
SELECT parkey, parval, date_reg, date_mod, mod_user_id
FROM parameters
WHERE parkey = 'ENABLED_FIFO_STOCK_VALUATION';
```

`parval` doit valoir exactement `true` (minuscules ou majuscules). Toute autre chaîne (`1`, `oui`, `true ` avec espace) est lue comme désactivé : les entrées augmentent le magasin et ne créent pas de lot. La livraison, elle, ne contrôle les lots que lorsque la valeur est lue comme vrai.

```sql
SELECT id,
       source_type,
       status,
       quantity_initial,
       quantity_remaining,
       unit_purchase_price,
       entry_date,
       date_reg AS cree_le,
       reg_user_id,
       stock_reception_item_id
FROM article_stock_lot
WHERE article_id = :article_id
ORDER BY date_reg, id;
```

Noter `cree_le` du lot `MIGRATION` : c’est **T0**. `quantity_initial` de ce lot est la quantité que l’activation a cru trouver en magasin.

## 4. Chronologie de tout ce qui a changé le stock

Une ligne = une action utilisateur (ou l’annulation d’une réception). `operation_user` est le compte connecté.

```sql
SELECT h.occurred_at,
       h.operation_type,
       h.operation_quantity,
       h.initial_quantity,
       h.final_quantity,
       h.operation_user,
       h.reference_type,
       h.reference_id,
       h.reference_label,
       h.reason
FROM article_history h
WHERE h.articles_id = :article_id
  AND h.visibility = 'ENABLED'
ORDER BY h.occurred_at, h.id;
```

Lecture :

| `operation_type` | Ce que l’utilisateur a fait | Effet sur le magasin |
|---|---|---|
| `ENTREE` | Validation d’une entrée de stock (réception) | hausse |
| `RETURN` | Retour magasin validé (crédit ou tontine) | hausse |
| `INVENTORY_ADJUSTMENT` | Régularisation d’inventaire | hausse ou baisse |
| `SORTIE` | Livraison d’une demande, ou sortie crédit | baisse |
| `CANCEL_RECEPTION` | Annulation d’une entrée déjà validée | baisse |
| `RESET` | Remise à zéro du stock article | baisse à 0 |

Le passage de 3 à 22 est la somme des hausses après la dernière ligne dont `final_quantity` vaut 3. Relever pour chaque hausse : l’heure, l’utilisateur, le type, et `reference_label`.

Mouvements techniques (même faits, autre table, utile si l’historique article est incomplet) :

```sql
SELECT movement_date,
       movement_type,
       quantity,
       stock_before,
       stock_after,
       performed_by,
       reason,
       unit_cost
FROM stock_movement
WHERE article_id = :article_id
  AND visibility = 'ENABLED'
ORDER BY movement_date, id;
```

`movement_type` : `ENTRY` (entrée validée), `RETURN` (retour), `INVENTORY_ADJUSTMENT` (inventaire), `RELEASE` (sortie), `ADJUSTMENT`, `LOSS`.

## 5. Entrées de stock : validées ou seulement saisies

Saisir une entrée crée une réception **en attente**. Le magasin et le lot ne bougent qu’à la **validation**.

```sql
SELECT r.id,
       r.reference,
       r.status,
       r.reception_date,
       r.date_reg AS saisie_le,
       r.received_by AS saisi_par,
       r.validated_at,
       r.validated_by,
       r.cancelled_at,
       r.cancelled_by,
       i.id AS ligne_id,
       i.quantity AS quantite_unites,
       i.unit_price,
       i.entry_packaging_mode,
       i.package_count,
       i.units_per_package_snapshot,
       l.id AS lot_id,
       l.quantity_initial AS lot_qte,
       l.quantity_remaining AS lot_restant,
       l.source_type,
       l.date_reg AS lot_cree_le
FROM stock_reception_item i
JOIN stock_reception r ON r.id = i.stock_reception_id
LEFT JOIN article_stock_lot l ON l.stock_reception_item_id = i.id
WHERE i.article_id = :article_id
ORDER BY COALESCE(r.validated_at, r.date_reg), i.id;
```

Pour chaque ligne :

- `status = 'PENDING'` : saisie seulement. Elle n’explique pas le stock à 22.
- `status = 'VALIDATED'` et `lot_id` renseigné : l’entrée a suivi le FIFO. `lot_qte` doit égaler `quantite_unites`.
- `status = 'VALIDATED'` et `lot_id` vide : **le magasin a pris la quantité, aucun lot n’a été créé pour cette entrée.** C’est le cas à isoler. Noter `validated_at`, `validated_by`, `quantite_unites`, `unit_price`, et si `validated_at` est avant ou après T0.
- `status = 'CANCELLED'` : l’annulation a retiré le stock. Le lot, s’il existait encore intact, est supprimé avec l’annulation.

Somme utile :

```sql
SELECT COALESCE(SUM(i.quantity) FILTER (WHERE r.status = 'VALIDATED'), 0) AS unites_entrees_validees,
       COALESCE(SUM(i.quantity) FILTER (
           WHERE r.status = 'VALIDATED' AND l.id IS NULL), 0) AS unites_validees_sans_lot,
       COALESCE(SUM(i.quantity) FILTER (WHERE r.status = 'PENDING'), 0) AS unites_encore_en_attente
FROM stock_reception_item i
JOIN stock_reception r ON r.id = i.stock_reception_id
LEFT JOIN article_stock_lot l ON l.stock_reception_item_id = i.id
WHERE i.article_id = :article_id;
```

`unites_validees_sans_lot` est le volume d’entrées qui ont gonflé le magasin hors FIFO.

## 6. Retours au magasin

```sql
SELECT rt.reference,
       rt.status,
       rt.return_date,
       rt.received_date,
       rt.collector,
       rt.date_reg,
       ri.quantity,
       ri.unit_price,
       'STOCK_RETURN' AS origine
FROM stock_return_item ri
JOIN stock_return rt ON rt.id = ri.stock_return_id
WHERE ri.article_id = :article_id
  AND rt.visibility = 'ENABLED'
ORDER BY rt.date_reg;
```

Un retour ne réintègre le magasin qu’au statut `RECEIVED`. Croiser la quantité avec un lot `source_type = 'STOCK_RETURN'` créé à la même heure (section 3). Un retour `RECEIVED` sans lot correspondant est une hausse de stock hors FIFO. Répéter la lecture pour la tontine si la section 4 montre `reference_type = 'STOCK_TONTINE_RETURN'` :

```sql
SELECT r.id,
       r.status,
       r.collector,
       r.return_date,
       r.received_date,
       r.received_by,
       r.date_reg,
       i.quantity
FROM stock_tontine_return_item i
JOIN stock_tontine_return r ON r.id = i.stock_tontine_return_id
WHERE i.article_id = :article_id
  AND r.visibility = 'ENABLED'
ORDER BY r.date_reg;
```

Même lecture que le retour crédit : seul le statut `RECEIVED` a réintégré le magasin. L’historique de la section 4 reste la preuve que la quantité a bougé.

## 7. Inventaire (ce n’est pas une entrée de stock)

Une régularisation aligne le stock sur le comptage physique. Avant correctif, elle ne créait pas de lot.

```sql
SELECT inv.id AS inventaire_id,
       inv.inventory_date,
       inv.status AS statut_inventaire,
       inv.created_by,
       inv.completed_at,
       ii.system_quantity AS stock_au_comptage,
       ii.physical_quantity AS compte,
       ii.difference,
       ii.status AS statut_ligne,
       ii.reconciled_at,
       ii.reconciled_by,
       ii.reconciliation_comment,
       rec.action,
       rec.performed_at,
       rec.performed_by,
       rec.stock_before,
       rec.stock_after,
       rec.comment
FROM inventory_item ii
JOIN inventory inv ON inv.id = ii.inventory_id
LEFT JOIN inventory_reconciliation rec ON rec.inventory_item_id = ii.id
WHERE ii.article_id = :article_id
  AND ii.visibility = 'ENABLED'
ORDER BY COALESCE(rec.performed_at, ii.reconciled_at, inv.date_reg);
```

Si `stock_after - stock_before` explique les +19, l’utilisateur a fait une **régularisation d’inventaire**, pas une entrée. Actions : `ADJUST_TO_PHYSICAL`, `MARK_AS_SURPLUS`, `MARK_AS_DEBT`, `CANCEL_DEBT`. Le compte est `performed_by`.

## 8. Trancher

Poser T0 = `date_reg` du lot `MIGRATION` (section 3). Comparer chaque hausse de la section 4 à T0 et aux lots.

1. **Entrée validée après T0, `lot_id` vide (section 5).** L’utilisateur a validé une entrée alors que le FIFO était actif. Le magasin a augmenté, le lot de cette entrée n’existe pas. Colonnes à remonter : référence, `validated_by`, `validated_at` (UTC+4), quantité, prix unitaire.
2. **Entrées validées avant T0, et `quantity_initial` du lot MIGRATION égal à la dernière `final_quantity` d’historique avant T0.** Les 19 unités ne sont pas des entrées d’après activation. Le lot d’ouverture a repris le stock de ce moment-là (3). Les hausses sont après T0 : revenir au point 1, ou au point 3 s’il n’y a aucune réception validée sans lot.
3. **Dernière `final_quantity` avant T0 déjà supérieure à `quantity_initial` du lot MIGRATION** (par exemple historique déjà à 22, lot d’ouverture à 3). L’activation a figé une quantité qui n’était plus celle du magasin. Les entrées, elles, avaient déjà été validées avant. Remonter la dernière ligne d’historique avant T0 et le lot MIGRATION côte à côte.
4. **Hausse `INVENTORY_ADJUSTMENT` sans lot `INVENTORY_ADJUSTMENT`.** Régularisation d’inventaire. Remonter inventaire, action, `performed_by`, `stock_before`, `stock_after`.
5. **Hausse `RETURN` sans lot `STOCK_RETURN`.** Retour magasin validé sans lot. Remonter la référence du retour et le collecteur.
6. **Réceptions seulement `PENDING`.** Personne n’a validé ces entrées : elles ne sont pas dans le magasin. Le +19 vient d’une autre ligne de la section 4.

## 9. Ce qu’il faut renvoyer

Une fois les requêtes passées, le compte-rendu tient en quelques lignes :

- id article, nom affiché, `stock_quantity`, somme des lots ouverts, écart ;
- `parval` du paramètre FIFO ;
- T0 (UTC et UTC+4) et `quantity_initial` du lot `MIGRATION` ;
- chaque hausse qui compose l’écart : heure Maurice, utilisateur, type (`ENTREE`, `RETURN`, `INVENTORY_ADJUSTMENT`), référence, quantité, et « lot créé : oui/non » ;
- la liste des autres articles en écart (section 2), même vide.

Ne pas corriger les données à la main dans `article_stock_lot` au fil de cette lecture.
