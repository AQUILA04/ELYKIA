# Implementation Plan

## Overview

Ce plan vérifie et documente le correctif déjà appliqué dans `processValidationLogic` de `StockTontineReturnService` : la boucle de réintégration magasin (`makeEntry`, `articlesService.update`, `stockMovementService.recordMovement(RETURN, STOCK_TONTINE_RETURN)`) est maintenant appelée pour chaque item, aussi bien via `validate()` que lors d'une création directe par un magasinier. Les tâches suivent l'ordre exploration → préservation → implémentation/vérification → documentation.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stock Magasin Non Réintégré à la Validation
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating `Articles.stockQuantity` n'est pas incrémenté après `validate()`
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — un retour `CREATED` avec un item de quantité N ; après `validate()`, `stockQuantity` doit avoir augmenté de N
  - Ajouter un test dans `StockTontineReturnServiceTest` : créer un mock `StockTontineReturn` avec statut `CREATED`, un item de quantité quelconque, appeler `validate()` et vérifier que `articlesService.update(article)` est appelé et que `article.makeEntry(N)` a bien été invoqué
  - Vérifier aussi que `stockMovementService.recordMovement` est appelé avec `MovementType.RETURN` et le contexte `STOCK_TONTINE_RETURN` (depuis `isBugCondition` du design : `returnRequest.status == RECEIVED AND processValidationLogic appelé AND Articles.stockQuantity n'a PAS été incrémenté`)
  - Expected Behavior (depuis design) : `stockAfter == stockBefore + item.quantity` et existence d'un `StockMovement(type=RETURN, referenceType=STOCK_TONTINE_RETURN)`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS on unfixed code (confirms bug exists)
  - Document counterexamples : `Articles.stockQuantity` reste inchangé, aucun `StockMovement RETURN/STOCK_TONTINE_RETURN` créé
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Chemins Non Affectés (CREATED, CANCELLED, REFUSED, FIFO)
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (cas où `isBugCondition` est faux)
  - Ajouter dans `StockTontineReturnServiceTest` un test par chemin non affecté :
    - **Création sans validation** : appeler `save()` avec un utilisateur non-magasinier (statut `CREATED`) ; vérifier que `articlesService.update` n'est PAS appelé et que `stockMovementService.recordMovement` n'est PAS appelé
    - **Annulation** : appeler `cancelReturn()` sur un retour `CREATED` ; vérifier que ni `articlesService` ni `stockMovementService` ne sont appelés
    - **Refus** : appeler `refuseReturn()` sur un retour `CREATED` ; vérifier que ni `articlesService` ni `stockMovementService` ne sont appelés
    - **Chemin FIFO** : appeler `createAndValidateForPriceRealignment(reintegrateToWarehouse=true)` ; vérifier que `stockValuationFacade.registerEntry` est appelé (chemin FIFO préservé)
  - Write property-based test capturing: for all non-buggy inputs (`NOT isBugCondition`), `Articles.stockQuantity` reste inchangé (Preservation Requirements du design : statuts `CREATED`, `CANCELLED`, `REFUSED` et chemin `createAndValidateForPriceRealignment`)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix for réintégration stock magasin à la validation tontine

  - [ ] 3.1 Vérifier la compilation backend
    - Exécuter `mvn compile -pl backend` depuis la racine du projet
    - Corriger toute erreur de compilation avant de continuer
    - Vérifier en particulier les imports de `MovementType`, `StockHistoryReferenceType`, `ArticleHistoryContext` dans `StockTontineReturnService`
    - _Bug_Condition: `isBugCondition(returnRequest)` = `returnRequest.status == RECEIVED AND processValidationLogic appelé AND Articles.stockQuantity n'a PAS été incrémenté`_
    - _Expected_Behavior: pour chaque item, `article.makeEntry(item.getQuantity())`, `articlesService.update(article)`, `stockMovementService.recordMovement(RETURN, STOCK_TONTINE_RETURN)`_
    - _Preservation: `reintegrateToWarehouse` inchangé ; chemins annulation/refus/CREATED non touchés_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stock Magasin Réintégré à la Validation
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior : `articlesService.update` appelé, `stockMovementService.recordMovement(RETURN, STOCK_TONTINE_RETURN)` appelé pour chaque item
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Chemins Non Affectés
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions on CREATED/CANCELLED/REFUSED/FIFO paths)
    - Confirm all tests still pass after fix (no regressions)

  - [ ] 3.4 Test d'intégration Postgres — `validate()` incrémente le stock et enregistre le mouvement
    - Ajouter un test d'intégration `create-drop` (cohérent avec `DailyReportPdfServiceTest` et les tests Postgres existants du projet)
    - Créer un `Articles` avec `stockQuantity` initial en base
    - Créer un `TontineStock` lié au commercial
    - Créer un `StockTontineReturn` en statut `CREATED` avec un item de quantité N
    - Appeler `service.validate(id)` dans le contexte Spring
    - Lire `Articles.stockQuantity` en base → vérifier qu'il vaut `stockInitial + N`
    - Lire les `StockMovement` en base → vérifier qu'il existe un mouvement `type=RETURN`, `referenceType=STOCK_TONTINE_RETURN`, `referenceId=returnId`
    - _Requirements: 2.1, 2.2_

  - [ ] 3.5 Vérifier que `createAndValidateForPriceRealignment` appelle toujours `stockValuationFacade`
    - Ajouter ou compléter un test unitaire dans `StockTontineReturnServiceTest`
    - Appeler `createAndValidateForPriceRealignment(collector, article, 5, comment, true)`
    - Vérifier que `stockValuationFacade.lockAndIsFifoEnabled()` est appelé
    - Vérifier que `stockValuationFacade.registerEntry(...)` est appelé pour l'item
    - Vérifier que `processValidationLogic` s'est exécuté (via `tontineStockService.processStockReturn` appelé)
    - Ce test garantit que le correctif dans `processValidationLogic` n'a pas perturbé le chemin FIFO
    - _Requirements: 3.3_

- [ ] 4. Mettre à jour `memory-bank/activeContext.md`
  - Ajouter en tête du Focus récent une entrée décrivant ce correctif :
    - **Correctif retour tontine — stock magasin** (Backend 1.65.0) : `processValidationLogic` dans `StockTontineReturnService` appelle désormais `article.makeEntry`, `articlesService.update` et `stockMovementService.recordMovement(RETURN, STOCK_TONTINE_RETURN)` pour chaque item, que le retour soit validé via `validate()` ou créé directement par un magasinier. Le chemin FIFO (`reintegrateToWarehouse`) reste inchangé. Tests unitaires et intégration Postgres ajoutés dans `StockTontineReturnServiceTest`.
  - Incrémenter le numéro de version Backend (1.64.1 → 1.65.0, correctif métier significatif)
  - _Requirements: 2.1, 2.2_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Exécuter `mvn test -pl backend -Dtest=StockTontineReturnServiceTest` pour l'ensemble de la suite unitaire
  - Vérifier que les 4 nouveaux tests passent (Property 1 bug condition, Property 2 preservation ×4 chemins, intégration Postgres, chemin FIFO)
  - Vérifier que les tests existants (`getKpis_aggregatesVisibleReturnStatuses`, `getAll_usesRequestedCollectorAndAllVisibleStatuses`, `validate_rejectsReturnThatIsNotCreatedWithoutUpdatingTontineStock`) passent toujours
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Le correctif (`processValidationLogic`) est déjà appliqué. Les tâches 1 et 2 s'exécutent rétrospectivement : sur le code fixé, Property 1 doit **passer** (confirme le fix) et Property 2 doit **passer** (confirme la préservation).
- La tâche 3.4 (intégration Postgres) requiert une base de données de test `create-drop` ; suivre le patron de `DailyReportPdfServiceTest` pour le contexte Spring de test.
- Incrément de version Backend : 1.64.1 → 1.65.0 (correctif métier affectant l'intégrité des stocks).
- `reintegrateToWarehouse` reste réservé au chemin FIFO (`createAndValidateForPriceRealignment`) et ne doit pas être modifié.
