# Plan d'implémentation : Livraison Partielle de Stock (partial-stock-delivery)

## Vue d'ensemble

Modifier la logique de livraison des demandes de sortie stock (`StockRequest` et `StockTontineRequest`) pour livrer les articles disponibles immédiatement et créer automatiquement une nouvelle demande validée pour les articles en rupture.

## Tâches

- [ ] 1. Mettre à jour le format de référence des demandes de stock
  - Dans `StockRequestService.createRequest()`, remplacer la logique de génération de référence actuelle par le format `REQ-YYYY-MM-XXXXXXXX`
    - `YYYY` = année courante (4 chiffres)
    - `MM` = mois courant (2 chiffres, zero-padded)
    - `XXXXXXXX` = `nextId` encodé en hexadécimal uppercase, zero-padded à 8 caractères (ex: `String.format("%08X", nextId)`)
    - Exemple : `REQ-2026-04-0000001A`
  - Dans `StockTontineRequestService.save()`, appliquer le même format avec le préfixe `TRQ` : `TRQ-YYYY-MM-XXXXXXXX`
  - La nouvelle demande pendante créée lors d'une livraison partielle doit également utiliser ce format

- [ ] 2. Créer le DTO de réponse `PartialDeliveryResponseDTO`
  - Créer la classe `PartialDeliveryResponseDTO` avec l'enum interne `DeliveryType { FULL, PARTIAL }`
  - Créer les classes `DeliveredItemDTO` et `PendingItemDTO`
  - Ajouter les champs : `deliveryType`, `deliveredRequestId`, `deliveredRequestReference`, `deliveredItems`, `pendingItems`, `pendingRequestId`, `pendingRequestReference`
  - _Requirements: 6.1_

- [ ] 3. Modifier `StockRequestService.deliverRequest()`
  - [ ] 3.1 Implémenter la classification des articles (disponibles vs en attente)
    - Pour chaque article, comparer `article.stockQuantity` vs `item.quantity`
    - Construire les listes `deliverableItems` et `pendingItems`
    - Si `deliverableItems` est vide → lever `CustomValidationException("Aucun article disponible pour la livraison")`
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ]* 3.2 Écrire le test de propriété pour la classification des articles
    - **Property 3 : Rejet si aucun article n'est disponible**
    - **Validates: Requirements 1.4**

  - [ ] 3.3 Implémenter la livraison complète (branche FULL)
    - Si `pendingItems` est vide → exécuter la logique de livraison existante
    - Retourner `PartialDeliveryResponseDTO` avec `deliveryType = FULL`, `pendingItems` vide, `pendingRequestId` null
    - _Requirements: 1.2, 6.2_

  - [ ]* 3.4 Écrire le test de propriété pour la livraison complète
    - **Property 1 : Livraison complète si tout le stock est disponible**
    - **Validates: Requirements 1.2, 6.2**

  - [ ] 3.5 Implémenter la livraison partielle (branche PARTIAL)
    - Livrer les `deliverableItems` : enregistrer les mouvements de stock et mettre à jour le stock mensuel commercial
    - Marquer la demande originale comme DELIVERED
    - Créer une nouvelle `StockRequest` avec les `pendingItems`, même `collector`, statut = VALIDATED (référence au format `REQ-YYYY-MM-XXXXXXXX`)
    - Retourner `PartialDeliveryResponseDTO` avec `deliveryType = PARTIAL`
    - Annoter la méthode avec `@Transactional` pour garantir l'atomicité
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1_

  - [ ]* 3.6 Écrire le test de propriété pour la livraison partielle
    - **Property 2 : Livraison partielle si certains articles manquent**
    - **Validates: Requirements 1.3, 6.3**

  - [ ]* 3.7 Écrire le test de propriété pour la quantité partielle
    - **Property 4 : Quantité partielle — livrer le disponible, reporter le reste**
    - **Validates: Requirements 1.5**

  - [ ]* 3.8 Écrire le test de propriété pour la demande pendante
    - **Property 5 : La demande pendante hérite du collector et est VALIDATED**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 3.9 Écrire le test de propriété pour les mouvements de stock
    - **Property 6 : Les mouvements de stock ne concernent que les articles livrés**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.10 Écrire le test de propriété pour la cohérence du DTO
    - **Property 7 : Cohérence du PartialDeliveryResponseDTO selon le type de livraison**
    - **Validates: Requirements 6.2, 6.3**

- [ ] 4. Modifier `StockTontineRequestService.deliver()`
  - Appliquer la même logique de classification et de livraison partielle que pour `StockRequestService`
  - Appeler `tontineStockService.processStockDelivery()` uniquement pour les `deliverableItems`
  - Créer une nouvelle `StockTontineRequest` avec les `pendingItems`, même `collector`, statut = VALIDATED (référence au format `TRQ-YYYY-MM-XXXXXXXX`)
  - Retourner `PartialDeliveryResponseDTO` avec le type approprié
  - _Requirements: 7.1, 7.2_

  - [ ]* 4.1 Écrire les tests unitaires pour `StockTontineRequestService.deliver()`
    - Tester les trois branches : FULL, PARTIAL, aucun article disponible
    - Vérifier que `tontineStockService.processStockDelivery()` n'est appelé que pour les articles livrés
    - _Requirements: 7.1, 7.2_

- [ ] 4. Mettre à jour les Controllers
  - [ ] 4.1 Mettre à jour `StockRequestController` : changer la signature de `deliverRequest()` pour retourner `ResponseEntity<PartialDeliveryResponseDTO>`
    - Gérer `EntityNotFoundException` → 404
    - Gérer `CustomValidationException` (statut non VALIDATED ou aucun article disponible) → 400
    - _Requirements: 4.2, 4.3, 7.3_

  - [ ] 4.2 Mettre à jour `StockTontineRequestController` : même mise à jour de signature
    - Même gestion des erreurs que `StockRequestController`
    - _Requirements: 4.2, 4.3, 7.3_

- [ ] 5. Checkpoint — Vérifier que tous les tests backend passent
  - S'assurer que tous les tests unitaires et de propriété passent, poser des questions à l'utilisateur si nécessaire.

- [ ] 6. Mettre à jour le Frontend — `stock-request-list.component.ts`
  - [ ] 6.1 Mettre à jour le type de retour de l'appel API pour utiliser `PartialDeliveryResponseDTO`
    - Définir l'interface TypeScript `PartialDeliveryResponseDTO` (avec `DeliveryType`, `deliveredItems`, `pendingItems`, etc.)
    - _Requirements: 6.1_

  - [ ] 6.2 Mettre à jour la méthode `deliver()` pour interpréter le résultat
    - Si `deliveryType === 'FULL'` → afficher un `toastr.success` simple
    - Si `deliveryType === 'PARTIAL'` → afficher un récapitulatif via `alertService.showInfo` avec les articles livrés et les informations sur la nouvelle demande pendante
    - Dans les deux cas, recharger la liste des demandes
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 6.3 Écrire les tests unitaires pour la méthode `deliver()` mise à jour
    - Tester l'affichage du toastr simple pour FULL
    - Tester l'affichage du récapitulatif pour PARTIAL
    - Tester le rechargement de la liste dans les deux cas
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Mettre à jour le Frontend — `stock-tontine-request-list.component.ts`
  - Appliquer les mêmes modifications que pour `stock-request-list.component.ts`
  - _Requirements: 5.1, 5.2, 5.3, 7.1_

  - [ ]* 7.1 Écrire le test de propriété pour le rechargement de la liste
    - **Property 8 : Rechargement de la liste après toute livraison**
    - **Validates: Requirements 5.3**

- [ ] 8. Checkpoint final — Vérifier que tous les tests passent
  - S'assurer que tous les tests (unitaires, de propriété, d'intégration) passent, poser des questions à l'utilisateur si nécessaire.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les tests de propriété valident les invariants universels définis dans le document de design
- L'annotation `@Transactional` sur les méthodes de service garantit le rollback complet en cas d'erreur (Exigence 4.1)
