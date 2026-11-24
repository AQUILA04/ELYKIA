# Retour Tontine — Stock Magasin Non Réintégré : Bugfix Design

## Overview

Lors de la validation d'un retour tontine standard, `processValidationLogic` appelle `tontineStockService.processStockReturn` qui soustrait correctement `TontineStock.availableQuantity` côté commercial. Mais il n'appelle pas `article.makeEntry` ni `stockMovementService.recordMovement`, de sorte que `Articles.stockQuantity` n'est jamais incrémenté et qu'aucun mouvement de stock magasin n'est enregistré. Les articles rendus disparaissent du stock tontine sans réapparaître en magasin.

Le chemin de réintégration existe déjà dans `reintegrateToWarehouse`, mais il passe par `stockValuationFacade` (réservé au chemin FIFO de réalignement de prix) et ne peut pas être réutilisé tel quel. Le correctif ajoute une boucle directe dans `processValidationLogic`, sans toucher au chemin FIFO ni à la logique `TontineStock`.

## Glossary

- **Bug_Condition (C)** : un retour tontine atteint le statut `RECEIVED` via `processValidationLogic` (chemin `validate()` ou création directe par un magasinier)
- **Property (P)** : pour chaque item du retour, `Articles.stockQuantity` doit être incrémenté et un mouvement `RETURN` doit être enregistré
- **Preservation** : tous les chemins qui ne passent pas par `processValidationLogic` (statut `CREATED` en attente, annulation, refus, `createAndValidateForPriceRealignment`) restent intacts
- **processValidationLogic** : méthode privée de `StockTontineReturnService` appelée à la validation ou à la création directe par un magasinier
- **reintegrateToWarehouse** : méthode privée de `StockTontineReturnService` réservée au chemin FIFO (`createAndValidateForPriceRealignment`)
- **TontineStock.returnQuantity** : méthode de `TontineStock` qui soustrait `availableQuantity` et incrémente `quantityReturned` — non modifiée

## Bug Details

### Bug Condition

Le bug se manifeste dès qu'un retour tontine est validé : que ce soit via `validate()` (statut `CREATED` → `RECEIVED`) ou via la création directe par un magasinier (statut `RECEIVED` immédiat). Dans les deux cas, `processValidationLogic` est appelé, et cette méthode ne touche pas `Articles.stockQuantity`.

**Formal Specification:**
```
FUNCTION isBugCondition(returnRequest)
  INPUT: returnRequest de type StockTontineReturn
  OUTPUT: boolean

  RETURN returnRequest.status == RECEIVED
         AND processValidationLogic a été appelé pour ce retour
         AND POUR TOUT item DE returnRequest.items :
               Articles.stockQuantity n'a PAS été incrémenté de item.quantity
END FUNCTION
```

### Examples

- **Création directe par un magasinier** : un commercial rend 10 unités d'article A. Le magasinier saisit le retour → statut `RECEIVED` immédiat. `TontineStock.availableQuantity` descend de 10. `Articles.stockQuantity` reste inchangé. Aucun mouvement `RETURN` enregistré.
- **Validation d'un retour en attente** : un commercial crée un retour (statut `CREATED`). Un magasinier valide via `PUT /stock-tontine-returns/{id}/validate`. `TontineStock.availableQuantity` descend. `Articles.stockQuantity` reste inchangé.
- **Réalignement de prix (`reintegrateToWarehouse = true`)** : non affecté par ce bug — ce chemin appelle déjà explicitement `reintegrateToWarehouse`.
- **Retour annulé ou refusé** : `TontineStock` et `Articles` ne sont jamais modifiés — comportement correct et préservé.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Un retour en statut `CREATED` (non encore validé) ne doit pas modifier `Articles.stockQuantity`
- L'annulation (`CANCELLED`) et le refus (`REFUSED`) ne doivent modifier ni `TontineStock` ni `Articles`
- `createAndValidateForPriceRealignment` avec `reintegrateToWarehouse = true` continue à passer par `stockValuationFacade` (chemin FIFO) sans altération
- `TontineStock.returnQuantity` conserve son comportement : soustrait `availableQuantity`, incrémente `quantityReturned`

**Scope:**
Seul `processValidationLogic` est modifié. Tous les chemins qui ne font pas appel à cette méthode sont hors périmètre du correctif.

## Hypothesized Root Cause

La méthode `processValidationLogic` a été écrite pour gérer uniquement le côté tontine (mise à jour de `TontineStock` via `tontineStockService.processStockReturn`). La réintégration côté magasin a été implémentée séparément dans `reintegrateToWarehouse`, utilisée exclusivement par `createAndValidateForPriceRealignment`. Aucun appel à `reintegrateToWarehouse` ni à une logique équivalente n'a été ajouté dans `processValidationLogic`, vraisemblablement parce que ce chemin a été ajouté après coup ou parce que la séparation des responsabilités n'a pas été finalisée lors de la première implémentation.

**Hypothèse principale** : oubli d'appel — la boucle de réintégration magasin n'a simplement jamais été branchée sur le chemin de validation standard.

**Hypothèses secondaires écartées** :
- Ce n'est pas un problème de transaction (tout est dans `@Transactional`)
- Ce n'est pas un problème de chargement des items (ils sont déjà parcourus dans `processValidationLogic` pour calculer `totalAmount`)
- Ce n'est pas un problème de dépendances manquantes (`articlesService` et `stockMovementService` sont déjà injectés)

## Correctness Properties

Property 1: Bug Condition — Réintégration Stock Magasin à la Validation

_For any_ `StockTontineReturn` où `isBugCondition` est vrai (retour atteint le statut `RECEIVED` via `processValidationLogic`), la méthode corrigée SHALL, pour chaque item du retour, appeler `article.makeEntry(item.getQuantity())`, persister l'article via `articlesService.update(article)`, et enregistrer un mouvement `MovementType.RETURN` via `stockMovementService.recordMovement` avec le contexte `StockHistoryReferenceType.STOCK_TONTINE_RETURN`.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Chemins Non Affectés

_For any_ `StockTontineReturn` où `isBugCondition` est faux (statut `CREATED` en attente, `CANCELLED`, `REFUSED`, ou chemin `createAndValidateForPriceRealignment`), le code corrigé SHALL produire exactement le même comportement que le code original, sans modifier `Articles.stockQuantity` pour les retours non validés et en conservant le chemin FIFO pour le réalignement de prix.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `backend/src/main/java/com/optimize/elykia/core/service/stock/StockTontineReturnService.java`

**Method**: `processValidationLogic`

**Specific Changes**:

1. **Ajout de la boucle de réintégration magasin** : après l'appel à `tontineStockService.processStockReturn(returnRequest)` et `super.update(returnRequest)`, ajouter une boucle sur `returnRequest.getItems()` qui, pour chaque item :
   - Récupère l'entité fraîche via `articlesService.getById(item.getArticle().getId())`
   - Appelle `article.makeEntry(item.getQuantity())`
   - Persiste via `articlesService.update(article)`
   - Enregistre le mouvement via `stockMovementService.recordMovement`

2. **Paramètres du mouvement** :
   - `article` : entité fraîche récupérée
   - `MovementType.RETURN`
   - `item.getQuantity()`
   - Description : `"Retour tontine " + returnRequest.getId()`
   - Collector (acteur) : `returnRequest.getCollector()` (commercial qui rend les articles)
   - `null` pour le lot
   - `article.getPurchasePrice()` comme coût unitaire
   - Contexte : `ArticleHistoryContext.withReference(returnRequest.getCollector(), StockHistoryReferenceType.STOCK_TONTINE_RETURN, returnRequest.getId(), null)`

3. **Ce qui ne change pas** : `reintegrateToWarehouse` reste inchangé et réservé au chemin FIFO. `TontineStock.returnQuantity` n'est pas modifié. Les chemins annulation/refus/`CREATED` ne sont pas touchés.

## Testing Strategy

### Validation Approach

Deux phases : d'abord constater l'absence de réintégration sur le code non corrigé (bug condition), puis vérifier que le correctif réintègre correctement tout en préservant les autres chemins.

### Exploratory Bug Condition Checking

**Goal** : Démontrer que `Articles.stockQuantity` n'est pas incrémenté après validation sur le code actuel. Confirmer que `TontineStock.availableQuantity` est bien soustrait (comportement correct côté tontine).

**Test Plan** : Créer un retour tontine en état `CREATED`, appeler `validate()`, observer que `Articles.stockQuantity` reste inchangé et qu'aucun mouvement `RETURN` n'est enregistré.

**Test Cases**:
1. **Validation standard** : créer un retour `CREATED`, appeler `validate()`, vérifier `Articles.stockQuantity` inchangé (démonstration du bug)
2. **Création directe magasinier** : simuler une création avec profil magasinier, vérifier `Articles.stockQuantity` inchangé
3. **Mouvement absent** : vérifier qu'aucun mouvement `MovementType.RETURN` lié à `STOCK_TONTINE_RETURN` n'est créé
4. **Côté tontine correct** : vérifier que `TontineStock.availableQuantity` descend bien (ce chemin fonctionne)

**Expected Counterexamples**:
- `Articles.stockQuantity` reste inchangé après `validate()`
- Aucun `StockMovement` de type `RETURN` / `STOCK_TONTINE_RETURN` créé

### Fix Checking

**Goal** : Vérifier que pour tout retour validé, `Articles.stockQuantity` est incrémenté et le mouvement enregistré.

**Pseudocode:**
```
FOR ALL returnRequest WHERE isBugCondition(returnRequest) DO
  stockBefore := Articles.stockQuantity
  validate(returnRequest.id)
  stockAfter := Articles.stockQuantity
  ASSERT stockAfter == stockBefore + sum(item.quantity FOR item IN returnRequest.items)
  ASSERT EXISTS StockMovement(type=RETURN, referenceType=STOCK_TONTINE_RETURN, referenceId=returnRequest.id)
END FOR
```

### Preservation Checking

**Goal** : Vérifier que les retours `CREATED` non validés, les annulations, les refus, et le chemin FIFO ne sont pas affectés.

**Pseudocode:**
```
FOR ALL returnRequest WHERE NOT isBugCondition(returnRequest) DO
  stockBefore := Articles.stockQuantity
  performNonValidationOperation(returnRequest)
  stockAfter := Articles.stockQuantity
  ASSERT stockAfter == stockBefore  // pour CREATED, CANCELLED, REFUSED
END FOR
```

**Testing Approach** : tests unitaires ciblés par chemin, puis test d'intégration Postgres (cohérent avec la pratique du projet : `DailyReportPdfServiceTest`, tests `create-drop`).

**Test Cases**:
1. **Création sans validation** : un retour créé par un non-magasinier ne modifie pas `Articles.stockQuantity`
2. **Annulation** : `cancelReturn` ne modifie ni `TontineStock` ni `Articles`
3. **Refus** : `refuseReturn` ne modifie ni `TontineStock` ni `Articles`
4. **Chemin FIFO préservé** : `createAndValidateForPriceRealignment(reintegrateToWarehouse=true)` appelle toujours `stockValuationFacade`

### Unit Tests

- Tester `processValidationLogic` avec un mock `articlesService` et `stockMovementService` : vérifier les appels `makeEntry`, `update`, `recordMovement` pour chaque item
- Tester que `reintegrateToWarehouse` n'est pas appelé dans `processValidationLogic`
- Tester les chemins annulation et refus : vérifier que `articlesService` n'est pas appelé

### Property-Based Tests

- Générer des retours avec 1 à N items de quantités aléatoires : vérifier que `stockQuantity` total incrémenté = somme des quantités des items
- Générer des retours non validés : vérifier que `stockQuantity` reste inchangé dans tous les cas
- Vérifier la création exacte d'un mouvement par item, avec le bon `collector` et la bonne référence

### Integration Tests

- Test Postgres `create-drop` : créer un article, un stock tontine, un retour complet, appeler `validate()`, lire `Articles.stockQuantity` en base et vérifier l'incrément
- Vérifier la présence du mouvement `StockMovement` en base après validation
- Vérifier que `createAndValidateForPriceRealignment` produit toujours un lot FIFO via `stockValuationFacade`
