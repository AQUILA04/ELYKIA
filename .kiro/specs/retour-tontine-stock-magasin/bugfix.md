# Bugfix Requirements Document

## Introduction

Lors de la validation d'un retour tontine standard (via `validate()` ou création directe par un magasinier), le stock magasin (`Articles.stockQuantity`) n'est pas réintégré. Seul le stock tontine du commercial (`TontineStock.availableQuantity`) est mis à jour correctement. Résultat : les articles rendus par le commercial disparaissent du stock tontine sans jamais réapparaître en magasin.

Le chemin de réintégration existe déjà dans `reintegrateToWarehouse` (utilisé par `createAndValidateForPriceRealignment`), mais il n'est pas appelé dans `processValidationLogic`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN un retour tontine est validé via `validate()` THEN le système soustrait `availableQuantity` du `TontineStock` du commercial sans augmenter `Articles.stockQuantity` ni enregistrer de mouvement de stock magasin

1.2 WHEN un magasinier crée directement un retour tontine (statut `RECEIVED` immédiat) THEN le système soustrait `availableQuantity` du `TontineStock` du commercial sans augmenter `Articles.stockQuantity` ni enregistrer de mouvement de stock magasin

### Expected Behavior (Correct)

2.1 WHEN un retour tontine est validé via `validate()` THEN le système SHALL appeler `article.makeEntry(item.getQuantity())` et `articlesService.update(article)` pour chaque article du retour, et SHALL enregistrer un mouvement `MovementType.RETURN` via `stockMovementService.recordMovement` avec le contexte `StockHistoryReferenceType.STOCK_TONTINE_RETURN`

2.2 WHEN un magasinier crée directement un retour tontine (statut `RECEIVED` immédiat) THEN le système SHALL appeler `article.makeEntry(item.getQuantity())` et `articlesService.update(article)` pour chaque article du retour, et SHALL enregistrer un mouvement `MovementType.RETURN` via `stockMovementService.recordMovement` avec le contexte `StockHistoryReferenceType.STOCK_TONTINE_RETURN`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un retour tontine est créé par un non-magasinier (statut `CREATED`, en attente de validation) THEN le système SHALL CONTINUE TO ne pas toucher `Articles.stockQuantity` jusqu'à la validation

3.2 WHEN un retour tontine est annulé ou refusé THEN le système SHALL CONTINUE TO ne modifier ni `TontineStock` ni `Articles.stockQuantity`

3.3 WHEN `createAndValidateForPriceRealignment` est appelé avec `reintegrateToWarehouse = true` THEN le système SHALL CONTINUE TO suivre le chemin FIFO via `stockValuationFacade` sans modification

3.4 WHEN `TontineStock.returnQuantity` est appelé THEN le système SHALL CONTINUE TO soustraire `availableQuantity` et incrémenter `quantityReturned` sans modification de sa logique interne
