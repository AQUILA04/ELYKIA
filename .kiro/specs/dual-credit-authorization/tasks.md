# Implementation Plan: Dual Credit Authorization

## Overview

Implémentation incrémentale du système dual-crédit avec habilitation business persistante et historique : migration Flyway → enum/entités backend → repositories → habilitation ClientService + historique → modification CreditService → endpoints REST client → interface Angular (fiche client + historique + formulaire vente) → tests unitaires et d'intégration.

## Tasks

- [ ] 1. Migration Flyway et schéma de base de données
  - [ ] 1.1 Créer le script Flyway `V{n}__add_dual_credit_authorization.sql`
    - Ajouter `credit_purpose VARCHAR(20) DEFAULT 'PERSONAL' NOT NULL` à la table `credit`
    - Exécuter `UPDATE credit SET credit_purpose = 'PERSONAL' WHERE credit_purpose IS NULL`
    - Ajouter à la table `client` : `business_credit_in_progress BOOLEAN DEFAULT FALSE NOT NULL`, `business_credit_authorized BOOLEAN DEFAULT FALSE NOT NULL`, `business_credit_authorized_by VARCHAR(255)`, `business_credit_authorized_at TIMESTAMP`
    - Créer la table `business_credit_authorization_event` (id, client_id, action, performed_by, performed_at, champs audit)
    - Créer l'index `idx_bca_event_client_performed` sur `business_credit_authorization_event(client_id, performed_at DESC)`
    - Créer l'index composite `idx_credit_client_purpose_status` sur `credit(client_id, credit_purpose, status, state)`
    - _Requirements: 1.4, 1.5, 4b.2, 6.4, 10.1_

- [ ] 2. Entités et enum backend
  - [ ] 2.1 Créer l'enum `CreditPurpose`
    - Créer `CreditPurpose.java` avec valeurs `PERSONAL` et `BUSINESS`
    - Documenter que `null` doit être traité comme `PERSONAL` en logique applicative
    - _Requirements: 1.1, 1.2_

  - [ ] 2.2 Créer l'enum `BusinessCreditAuthorizationAction`
    - Valeurs `AUTHORIZED` et `REVOKED`
    - _Requirements: 4b.1_

  - [ ] 2.3 Mettre à jour l'entité `Credit`
    - Ajouter le champ `creditPurpose` annoté `@Enumerated(EnumType.STRING)` avec `columnDefinition = "VARCHAR(20) DEFAULT 'PERSONAL'"` et valeur par défaut `CreditPurpose.PERSONAL`
    - _Requirements: 1.1_

  - [ ] 2.4 Mettre à jour l'entité `Client`
    - Ajouter `businessCreditInProgress`, `businessCreditAuthorized`, `businessCreditAuthorizedBy`, `businessCreditAuthorizedAt`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 2.5 Créer l'entité `BusinessCreditAuthorizationEvent`
    - Champs : `id`, `clientId`, `action`, `performedBy`, `performedAt`
    - Annoter `@Entity`, `@Table(name = "business_credit_authorization_event")`
    - _Requirements: 4b.1_

- [ ] 3. Repositories
  - [ ] 3.1 Mettre à jour `CreditRepository`
    - Ajouter `countByClientIdAndPurposeAndStatusIn` et `hasCreditInProgressForPurpose`
    - Mettre à jour `hasCreditInProgress(Long clientId)` pour couvrir les deux purposes
    - _Requirements: 2.1, 2.3, 10.4_

  - [ ] 3.2 Créer `BusinessCreditAuthorizationEventRepository`
    - `findByClientIdOrderByPerformedAtDesc(Long clientId) : List<BusinessCreditAuthorizationEvent>`
    - _Requirements: 4b.4_

- [ ] 4. DTOs
  - [ ] 4.1 Mettre à jour `CreditDto`
    - Ajouter le champ `creditPurpose` de type `CreditPurpose` (nullable)
    - _Requirements: 9.1_

  - [ ] 4.2 Mettre à jour `ClientDto` et `ClientRespDto`
    - Exposer `businessCreditAuthorized`, `businessCreditAuthorizedBy`, `businessCreditAuthorizedAt`, `businessCreditInProgress`
    - S'assurer que ces champs ne sont pas modifiables via le PUT client standard
    - _Requirements: 9.5_

  - [ ] 4.3 Créer `BusinessCreditAuthorizationEventDto`
    - Record avec `id`, `clientId`, `action`, `performedBy`, `performedAt`
    - _Requirements: 4b.5, 9.4_

- [ ] 5. Habilitation business dans ClientService
  - [ ] 5.1 Implémenter `authorizeBusinessCredit(Long clientId)`
    - Vérifier profil `GESTIONNAIRE`
    - Rejeter si client introuvable ou déjà autorisé
    - Poser `businessCreditAuthorized = true`, `authorizedBy`, `authorizedAt`
    - Persister un `BusinessCreditAuthorizationEvent` avec `action = AUTHORIZED`
    - Logger l'événement d'audit
    - _Requirements: 3.1, 3.2, 3.3–3.5, 3.8_

  - [ ] 5.2 Implémenter `revokeBusinessCreditAuthorization(Long clientId)`
    - Vérifier profil `GESTIONNAIRE`
    - Rejeter si client non autorisé
    - Poser `businessCreditAuthorized = false`, effacer `authorizedBy` et `authorizedAt`
    - Persister un `BusinessCreditAuthorizationEvent` avec `action = REVOKED`
    - Ne pas modifier `businessCreditInProgress` ni le crédit BUSINESS en cours
    - Logger l'événement d'audit
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9_

  - [ ] 5.3 Implémenter `getBusinessCreditAuthorizationHistory(Long clientId)`
    - Retourner la liste ordonnée par `performedAt` desc
    - _Requirements: 4b.4, 4b.5_

  - [ ]* 5.4 Écrire les tests unitaires pour l'habilitation business
    - `authorizeBusinessCredit_gestionnaire_succeeds_andPersistsEvent()`
    - `authorizeBusinessCredit_nonGestionnaire_throws()`
    - `authorizeBusinessCredit_alreadyAuthorized_throws()`
    - `revokeBusinessCredit_businessInProgress_succeeds_andPreservesInProgressFlag()`
    - `revokeBusinessCredit_success_clearsFields_andPersistsEvent()`
    - `getAuthorizationHistory_returnsOrderedEvents()`
    - _Requirements: 3.2, 3.5, 4.2, 4.8, 4.9_

- [ ] 6. Modification de ClientService — flags crédit en cours
  - [ ] 6.1 Mettre à jour `updateClientCreditStatus`
    - Modifier la signature pour accepter `CreditPurpose purpose`
    - Si `purpose = PERSONAL` ou `null` → mettre à jour `creditInProgress`
    - Si `purpose = BUSINESS` → mettre à jour `businessCreditInProgress`
    - Mettre à jour tous les appelants existants
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.10_

  - [ ]* 6.2 Écrire les tests unitaires pour `updateClientCreditStatus`
    - `updateCreditStatus_PERSONAL_updatesCreditInProgress_only()`
    - `updateCreditStatus_BUSINESS_updatesBusinessCreditInProgress_only()`
    - _Requirements: 6.5, 6.6, 6.10_

- [ ] 7. Modification de CreditService
  - [ ] 7.1 Mettre à jour `createCredit`
    - Si `credit.creditPurpose` est null, assigner `CreditPurpose.PERSONAL` avant les contrôles
    - Appeler `updateClientCreditStatus(clientId, credit.creditPurpose, true)` avec la nouvelle signature
    - _Requirements: 1.2, 1.3, 6.5, 6.6_

  - [ ] 7.2 Mettre à jour `creditUnicity`
    - Ignorer la vérification pour les clients de type != `CLIENT`
    - Résoudre `purpose = credit.creditPurpose ?? PERSONAL`
    - Vérifier unicité par purpose → lever `CustomValidationException` si doublon
    - Si `purpose = BUSINESS` : vérifier `client.businessCreditAuthorized = true` → lever exception si false (Option A)
    - _Requirements: 2.1–2.6, 5.1, 5.2, 5.3, 5.5_

  - [ ]* 7.3 Écrire les tests unitaires pour `CreditService`
    - `createCredit_withNullPurpose_defaultsToPERSONAL()`
    - `creditUnicity_PERSONAL_alreadyInProgress_throws()`
    - `creditUnicity_BUSINESS_alreadyInProgress_throws()`
    - `creditUnicity_BUSINESS_notAuthorized_throws()`
    - `creditUnicity_BUSINESS_authorized_succeeds()`
    - `creditUnicity_BUSINESS_authorized_noPersonalRequired()`
    - `creditUnicity_nonClientType_skipsCheck()`
    - _Requirements: 2.1–2.6, 5.1, 5.2, 5.5_

- [ ] 8. Checkpoint — vérifier que tous les tests unitaires backend passent
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Tests par propriétés (PBT) avec jqwik
  - [ ]* 9.1 Écrire le test PBT pour Property 1 — Unicité par purpose
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 9.2 Écrire le test PBT pour Property 5 — BUSINESS exige habilitation
    - **Validates: Requirements 5.1, 5.2, 5.5**

  - [ ]* 9.3 Écrire le test PBT pour Property 6 — Révocation indépendante du crédit en cours
    - **Validates: Requirements 4.8, 4.9**

  - [ ]* 9.4 Écrire le test PBT pour Property 7 — Historique immuable
    - **Validates: Requirements 3.2, 4.2, 4b.3**

- [ ] 10. Contrôleurs REST
  - [ ] 10.1 Mettre à jour `ClientController`
    - Exposer `POST /{clientId}/business-credit-authorization` → `authorizeBusinessCredit`
    - Exposer `DELETE /{clientId}/business-credit-authorization` → `revokeBusinessCreditAuthorization`
    - Exposer `GET /{clientId}/business-credit-authorization/history` → `getBusinessCreditAuthorizationHistory`
    - Protéger avec `@PreAuthorize` ou vérification GESTIONNAIRE dans le service
    - _Requirements: 3.7, 4.5, 4b.5, 9.2, 9.3, 9.4, 9.8_

  - [ ] 10.2 Mettre à jour `CreditController`
    - S'assurer que `CreditDto` (avec `creditPurpose`) est correctement désérialisé
    - Vérifier que les réponses d'erreur 400 exposent les messages de `CustomValidationException`
    - _Requirements: 9.1, 9.6, 9.7_

- [ ] 11. Checkpoint — vérifier le flux backend end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Test d'intégration backend
  - [ ]* 12.1 Écrire `BusinessCreditAuthorizationIntegrationTest`
    - Scénario : habilitation → création BUSINESS → révocation avec BUSINESS en cours → nouvelle création BUSINESS refusée → clôture → réhabilitation → historique complet
    - Scénario dual : PERSONAL + BUSINESS simultanés pour client habilité
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.8, 5.1, 6.5, 6.6_

  - [ ]* 12.2 Écrire `CreditRepositoryTest` pour `hasCreditInProgressForPurpose`
    - _Requirements: 2.1, 2.3, 10.4_

- [ ] 13. Interface Angular — habilitation client
  - [ ] 13.1 Ajouter l'action d'habilitation sur la liste client
    - Bouton « Autoriser crédit business » si `ROLE_VALIDATE_CREDIT` et `!businessCreditAuthorized`
    - Badge d'habilitation avec `authorizedBy` / `authorizedAt` si autorisé
    - Bouton « Retirer l'autorisation » si autorisé (même si `businessCreditInProgress`)
    - Message informatif si révocation avec BUSINESS en cours
    - Appels API POST/DELETE `/clients/{id}/business-credit-authorization`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 13.2 Ajouter l'action d'habilitation et l'historique sur la fiche client (détails)
    - Même logique que 13.1 pour les actions
    - Timeline historique via `GET /clients/{id}/business-credit-authorization/history`
    - _Requirements: 7.1–7.9, 4b.6, 4b.7_

- [ ] 14. Interface Angular — formulaire de création de vente à crédit
  - [ ] 14.1 Ajouter le sélecteur `creditPurpose` conditionnel
    - Afficher le radio PERSONAL / BUSINESS uniquement si `saleType === 'CREDIT'` ET `selectedClient.businessCreditAuthorized === true`
    - Définir `PERSONAL` comme valeur par défaut
    - Réinitialiser à `PERSONAL` si le client sélectionné change et n'est pas habilité
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ] 14.2 Inclure `creditPurpose` dans le payload de soumission
    - Inclure `creditPurpose` dans le `CreditDto` à chaque soumission
    - Afficher les erreurs backend (non habilité, business en cours)
    - _Requirements: 8.4, 8.6_

- [ ] 15. Checkpoint final — tous les tests passent
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être différées pour un MVP rapide
- Les propriétés PBT (tâches 9.x) nécessitent jqwik dans `pom.xml` — vérifier sa présence avant d'implémenter
- L'ordre 1→2→3→4→5→6→7 garantit qu'aucun code en aval ne référence des symboles non encore définis
- Les tâches 7.1 et 7.2 dépendent de 3.1 et 6.1 : ne pas les implémenter avant
- Toute `CustomValidationException` doit conserver le pattern déjà en place dans le projet
- La compatibilité ascendante est garantie par la migration Flyway (tâche 1.1) avant tout changement de code
- **Option A** : tout crédit BUSINESS exige `businessCreditAuthorized = true`, même sans PERSONAL en cours
- **Révocation toujours possible** : même avec BUSINESS en cours ; n'affecte que les futures créations
- **Historique immuable** : table `business_credit_authorization_event`, insert-only

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["3.1", "3.2", "4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.2"] },
    { "id": 6, "tasks": ["5.4", "7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "10.1", "10.2"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.4", "12.2"] },
    { "id": 9, "tasks": ["12.1", "13.1"] },
    { "id": 10, "tasks": ["13.2", "14.1", "14.2"] }
  ]
}
```
