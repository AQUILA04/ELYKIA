# Tasks : Historique des Mouvements de Stock Commercial

## Liste des tâches

- [ ] 1. Créer l'enum `CommercialStockMovementType`
  - [ ] 1.1 Créer `CommercialStockMovementType.java` dans `com.optimize.elykia.core.enumaration` avec les valeurs : `CREDIT_SALE`, `CASH_SALE`, `STOCK_IN`, `RETURN`, `ADJUSTMENT`

- [ ] 2. Créer l'entité `CommercialStockMovement`
  - [ ] 2.1 Créer `CommercialStockMovement.java` dans `com.optimize.elykia.core.entity.stock`
  - [ ] 2.2 Déclarer les champs : `id`, `stockItem` (ManyToOne), `credit` (ManyToOne nullable), `creditReference`, `collector`, `article` (ManyToOne), `movementType`, `quantityBefore`, `quantityMoved`, `quantityAfter`, `operationDate`
  - [ ] 2.3 Étendre `Auditable<String>` (pattern existant du projet)

- [ ] 3. Créer le repository `CommercialStockMovementRepository`
  - [ ] 3.1 Créer l'interface dans `com.optimize.elykia.core.repository`
  - [ ] 3.2 Ajouter les méthodes : `findByStockItem_IdOrderByOperationDateDesc`, `findByCredit_IdOrderByOperationDateDesc`, `findByCollectorAndMovementTypeOrderByOperationDateDesc`

- [ ] 4. Créer le service `CommercialStockMovementService`
  - [ ] 4.1 Créer `CommercialStockMovementService.java` dans `com.optimize.elykia.core.service.stock`
  - [ ] 4.2 Implémenter la méthode `record(stockItem, credit, movementType, quantityBefore, quantityMoved, quantityAfter)`
  - [ ] 4.3 Implémenter `getByStockItem(Long stockItemId)` et `getByCredit(Long creditId)`

- [ ] 5. Créer le DTO `CommercialStockMovementDto`
  - [ ] 5.1 Créer le record `CommercialStockMovementDto` dans `com.optimize.elykia.core.dto`
  - [ ] 5.2 Implémenter la méthode statique `fromEntity(CommercialStockMovement)`

- [ ] 6. Intégrer dans `CreditService.distributeArticlesV2`
  - [ ] 6.1 Injecter `CommercialStockMovementService` dans `CreditService` via setter `@Autowired`
  - [ ] 6.2 Dans la boucle de traitement des articles, capturer `quantityBefore` avant `stockItem.updateRemaining()`
  - [ ] 6.3 Appeler `commercialStockMovementService.record(...)` avec `CommercialStockMovementType.CREDIT_SALE` après `updateRemaining()`

- [ ] 7. Intégrer dans `CreditService.startCredit` (ventes CASH)
  - [ ] 7.1 Dans la boucle CASH de `startCredit`, capturer `quantityBefore` avant `stockItem.updateRemaining()`
  - [ ] 7.2 Appeler `commercialStockMovementService.record(...)` avec `CommercialStockMovementType.CASH_SALE` après `updateRemaining()`

- [ ] 8. Exposer les endpoints REST
  - [ ] 8.1 Créer ou enrichir un controller pour exposer `GET /api/stock/movements/item/{stockItemId}`
  - [ ] 8.2 Exposer `GET /api/stock/movements/credit/{creditId}`

- [ ] 9. Tests
  - [ ] 9.1 Écrire un test unitaire vérifiant P1 : `quantityAfter == quantityBefore - quantityMoved`
  - [ ] 9.2 Écrire un test d'intégration vérifiant qu'un mouvement `CREDIT_SALE` est bien créé après `distributeArticlesV2`
  - [ ] 9.3 Écrire un test d'intégration vérifiant qu'un mouvement `CASH_SALE` est bien créé après `startCredit`
