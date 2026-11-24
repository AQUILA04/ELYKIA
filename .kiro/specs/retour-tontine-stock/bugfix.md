# Bugfix Requirements Document

## Introduction

Lors de la validation d'un retour tontine — que ce soit via `StockTontineReturnService.validate` (magasinier qui reçoit un retour créé par un commercial) ou via la création directe par un magasinier — deux bugs empêchent la restitution correcte des articles au stock.

Bug 1 : `TontineStock.returnQuantity` **soustrait** `availableQuantity` au lieu de l'incrémenter, et sa garde se trompe de quantité de référence. Un retour doit recréditer le stock disponible du commercial, pas le diminuer.

Bug 2 : `StockTontineReturnService.processValidationLogic` recalcule le stock tontine du commercial via `tontineStockService.processStockReturn`, mais n'appelle jamais `article.makeEntry()` ni `articlesService.update()`. Le stock magasin (`Articles.stockQuantity`) n'est donc jamais réintégré lors d'un retour tontine standard.

Ces deux bugs s'enchaînent : même si le stock tontine était corrigé seul, le stock magasin resterait faux ; et vice-versa.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN un retour tontine est validé pour un article THEN le système **soustrait** la quantité retournée au `availableQuantity` du `TontineStock` du commercial au lieu de l'additionner, réduisant ainsi le stock disponible tontine.

1.2 WHEN la quantité à retourner dépasse le `availableQuantity` courant (cas normal quand une partie du stock a déjà été distribuée) THEN le système lève une `CustomValidationException` avec le message « Impossible de retourner plus que le stock disponible », bloquant à tort le retour.

1.3 WHEN un retour tontine standard est validé par le magasinier THEN le système n'appelle ni `article.makeEntry()` ni `articlesService.update()`, laissant le stock magasin (`Articles.stockQuantity`) inchangé et aucun mouvement de type `RETURN` n'est enregistré via `StockMovementService`.

### Expected Behavior (Correct)

2.1 WHEN un retour tontine est validé pour un article THEN le système SHALL **additionner** la quantité retournée au `availableQuantity` du `TontineStock` du commercial et SHALL incrémenter `quantityReturned` du même montant.

2.2 WHEN la quantité à retourner est inférieure ou égale à la quantité déjà distribuée (`distributedQuantity`) THEN le système SHALL accepter le retour sans exception ; la garde SHALL vérifier `quantity > distributedQuantity` et non `quantity > availableQuantity`.

2.3 WHEN un retour tontine standard est validé par le magasinier THEN le système SHALL appeler `article.makeEntry(quantity)` et `articlesService.update(article)` pour chaque article du retour, et SHALL enregistrer un mouvement de stock de type `MovementType.RETURN` via `StockMovementService.recordMovement` avec le contexte `StockHistoryReferenceType.STOCK_TONTINE_RETURN`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un retour tontine est créé par un commercial (statut `CREATED`) sans validation immédiate THEN le système SHALL CONTINUE TO créer l'entité sans toucher ni au stock tontine ni au stock magasin.

3.2 WHEN le chemin `createAndValidateForPriceRealignment` est utilisé avec `reintegrateToWarehouse = true` THEN le système SHALL CONTINUE TO appeler `reintegrateToWarehouse` (chemin FIFO via `stockValuationFacade`) sans doublon avec la nouvelle réintégration standard.

3.3 WHEN un retour est annulé ou refusé THEN le système SHALL CONTINUE TO uniquement mettre à jour le statut sans modifier aucun stock.

3.4 WHEN la quantité retournée dépasse la quantité distribuée (`quantity > distributedQuantity`) THEN le système SHALL CONTINUE TO lever une `CustomValidationException` pour signaler un retour incohérent.

3.5 WHEN `removeQuantity` est appelé sur un `TontineStock` THEN le système SHALL CONTINUE TO soustraire du `availableQuantity` et incrémenter le `distributedQuantity` sans modification.
