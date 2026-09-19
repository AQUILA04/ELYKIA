# Implementation Plan: Gestion Multi-Agences (Multi-Agency Management)

## Overview

Ce plan découpe la feature multi-agences en étapes incrémentales couvrant :
1. La migration Flyway et les entités JPA (socle de données)
2. Les services et repositories backend (logique métier)
3. Le filtre de cloisonnement et la sécurité JWT
4. Les endpoints REST et le contrôleur
5. Les modifications mobile (Angular/Ionic)
6. Les tests par propriétés (P1–P8)

Chaque tâche construit sur les précédentes et se termine par une intégration concrète dans le code existant.

---

## Tasks

- [ ] 1. Migration Flyway et entités JPA
  - [ ] 1.1 Créer le script Flyway `V102__multi_agency_management.sql`
    - Ajouter les colonnes `active`, `created_at`, `deactivated_at`, `deactivated_by` sur la table `agency` (idempotent via `ADD COLUMN IF NOT EXISTS`)
    - Ajouter la contrainte d'unicité `uq_agency_code` si absente
    - Créer la table `agency_assignment` (id, user_id, agency_id, start_date, end_date, assigned_by, notes, audit fields) avec `CREATE TABLE IF NOT EXISTS`
    - Ajouter la colonne `current_agency_id` sur `UACC`
    - Ajouter la colonne `agency_id` sur toutes les entités opérationnelles (client, recovery, mobile_transaction, stock_request, stock_return, commercial_monthly_stock, commercial_stock_movement, tontine_session, orders, daily_commercial_report, inventory, expense, accounting_day)
    - Insérer l'`Agence_Par_Défaut` (`code='DEFAULT'`) via `ON CONFLICT DO NOTHING`
    - Mettre à jour les entités orphelines (agency_id IS NULL) avec l'id de l'agence DEFAULT dans un bloc `DO $$`
    - Insérer les `AgencyAssignment` manquantes pour les utilisateurs sans affectation active
    - Créer tous les index de performance (idx_aa_user_end, idx_aa_agency_active, idx sur chaque table opérationnelle)
    - Envelopper l'ensemble dans `BEGIN … COMMIT`
    - _Requirements : 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 1.2 Écrire le test d'idempotence de la migration (P6)
    - **Property 6 : Idempotence de la migration**
    - Exécuter V102 une première fois, relever les compteurs (assignments, clients DEFAULT, etc.)
    - Ré-exécuter V102, vérifier que les compteurs sont identiques
    - **Validates : Requirements 8.4, 8.6**

  - [ ] 1.3 Étendre l'entité `Agency` avec les nouveaux champs
    - Ajouter `active` (boolean, default true), `createdAt`, `deactivatedAt`, `deactivatedBy` dans `Agency.java`
    - Ajouter le callback `@PrePersist` pour initialiser `createdAt`
    - Conserver tous les champs existants (phone, secretaryName, etc.)
    - _Requirements : 1.1, 1.2_

  - [ ] 1.4 Créer l'entité `AgencyAssignment`
    - Créer `AgencyAssignment.java` dans le module backend approprié
    - Champs : id, userId, agency (ManyToOne lazy), startDate, endDate, assignedBy, notes, audit fields
    - Implémenter la méthode utilitaire `isActive()` (endDate == null)
    - Annotations d'index : `@Index(name="idx_aa_user_end", …)`, `@Index(name="idx_aa_agency_active", …)`
    - _Requirements : 2.1, 3.5_

  - [ ] 1.5 Étendre `UserAccount` avec `currentAgencyId`
    - Ajouter le champ `currentAgencyId` (Long, nullable) dans `UserAccount.java`
    - _Requirements : 6.1, 6.3_

- [ ] 2. Repositories JPA
  - [ ] 2.1 Créer `AgencyRepository`
    - Étendre `JpaRepository<Agency, Long>`
    - Ajouter `existsByCodeAndActiveTrue(String code)` pour la contrainte d'unicité
    - Ajouter `findAllByActiveTrue()` pour la liste des agences actives
    - _Requirements : 1.1, 1.6, 1.7_

  - [ ] 2.2 Créer `AgencyAssignmentRepository`
    - Étendre `JpaRepository<AgencyAssignment, Long>`
    - Ajouter `findActiveAssignmentByUserId(Long userId)` (endDate IS NULL)
    - Ajouter `existsActiveAssignment(Long userId)` (endDate IS NULL)
    - Ajouter `findActiveUsersByAgencyId(Long agencyId)` (liste des userIds avec assignment active)
    - Ajouter `countActiveByUserId(Long userId)`
    - Ajouter `findByUserIdOrderByStartDateDesc(Long userId)` pour l'historique
    - Ajouter `findByUserIdOrderByStartDateAsc(Long userId)` pour les vérifications PBT
    - _Requirements : 2.1, 3.1, 3.5, 3.6, 3.7_

  - [ ] 2.3 Ajouter les requêtes `agencyId` sur les repositories opérationnels
    - Modifier `ClientRepository` : ajouter `findAllByAgency(@Param("agencyId") Long agencyId, Pageable)` avec `(:agencyId IS NULL OR c.agencyId = :agencyId)`
    - Reproduire le même pattern sur `RecoveryRepository`, `MobileTransactionRepository`, `StockRequestRepository`, `StockReturnRepository`, `CommercialMonthlyStockRepository`, `CommercialStockMovementRepository`, `TontineSessionRepository`, `OrderRepository`, `DailyCommercialReportRepository`, `InventoryRepository`, `ExpenseRepository`, `AccountingDayRepository`
    - _Requirements : 4.1, 5.1, 5.2_

- [ ] 3. Extension JWT et authentification
  - [ ] 3.1 Étendre `UserDetailsImpl` avec `agencyId`
    - Ajouter le champ `agencyId` (Long, nullable)
    - Mettre à jour `UserDetailsImpl.build(User user)` pour mapper `user.getUserAccount().getCurrentAgencyId()`
    - _Requirements : 6.1, 6.2, 6.3_

  - [ ] 3.2 Étendre `JwtUtils` avec le claim `agencyId`
    - Dans `generateJwtToken()`, ajouter `builder.claim("agencyId", userPrincipal.getAgencyId())`
    - Ajouter la méthode `getAgencyIdFromJwtToken(String token)` : extraire le claim et retourner `Long` (null si absent)
    - _Requirements : 6.1, 6.2, 6.3, 6.6_

  - [ ]* 3.3 Écrire les tests de propriété P3 pour le round-trip JWT
    - **Property 3 : Round-trip JWT avec agencyId**
    - Vérifier que `decode(generateJwt(u)).agencyId == agencyId` pour tout Profil_Terrain
    - Vérifier que le claim est null pour un Profil_Global
    - **Validates : Requirements 6.1, 6.2, 6.3, 6.6**

  - [ ] 3.4 Étendre `JwtResponse` avec `agencyId`
    - Ajouter le champ `agencyId` (Long, nullable) dans `JwtResponse.java`
    - _Requirements : 6.5_

  - [ ] 3.5 Étendre `AuthController.authenticateUser()` pour alimenter `agencyId`
    - Après génération du JWT, appeler `jwtResponse.setAgencyId(userDetails.getAgencyId())`
    - _Requirements : 6.1, 6.2, 6.5_

- [ ] 4. Services métier backend
  - [ ] 4.1 Créer `AgencyService`
    - Implémenter `createAgency(AgencyCreateDto)` : vérifier rôle ADMIN/SUPER_ADMIN, unicité du code, non-vide nom/code, sauvegarder
    - Implémenter `updateAgency(Long id, AgencyUpdateDto)` : mêmes règles d'unicité de code
    - Implémenter `deactivateAgency(Long id)` : vérifier absence d'utilisateurs actifs (sinon renvoyer la liste), positionner `active=false`, `deactivatedAt`, `deactivatedBy`
    - Implémenter `getAgencyById(Long id)` : inclure le nombre d'utilisateurs actifs dans le DTO
    - Implémenter `getAllActiveAgencies()` : `findAllByActiveTrue()`
    - Implémenter `getAgencySummary(Long agencyId)` : compter clients, crédits actifs, recouvrements, solde caisse ; retourner 404 si agence introuvable
    - _Requirements : 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.4, 5.5_

  - [ ]* 4.2 Écrire les tests de propriété P1 pour l'unicité du code d'agence
    - **Property 1 : Unicité du code d'agence**
    - Tenter de créer deux agences actives avec le même code, vérifier `CustomValidationException`
    - **Validates : Requirements 1.1, 1.2, 1.3**

  - [ ] 4.3 Créer `AgencyAssignmentService`
    - Implémenter `assignUserToAgency(Long userId, Long agencyId, String notes)` :
      - Vérifier rôle ADMIN/SUPER_ADMIN
      - Vérifier agence existante et active
      - Vérifier absence d'affectation active existante
      - Créer `AgencyAssignment`, activer le compte si Profil_Terrain inactif, mettre à jour `currentAgencyId`
    - Implémenter `getAssignmentHistory(Long userId)` : retourner la liste triée par date décroissante
    - _Requirements : 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.6, 3.7_

  - [ ]* 4.4 Écrire les tests de propriété P2 pour l'unicité de l'affectation active
    - **Property 2 : Unicité de l'affectation active**
    - Tenter une double affectation directe, vérifier rejet ; compter les affectations actives = 1
    - **Validates : Requirements 2.1, 3.1, 3.2**

  - [ ] 4.5 Créer `AgencyTransferService`
    - Implémenter `transferUser(Long userId, Long targetAgencyId, String notes)` :
      - Vérifier rôle ADMIN/SUPER_ADMIN
      - Vérifier existence d'une affectation active
      - Vérifier que la cible est différente de l'agence courante
      - Vérifier que l'agence cible est active
      - Clôturer l'ancienne affectation (endDate = today)
      - Créer la nouvelle affectation
      - Mettre à jour `currentAgencyId` sur `UserAccount`
      - Invalider tous les refresh tokens de l'utilisateur (`refreshTokenRepository.deleteAllByUserId`)
    - _Requirements : 3.1, 3.2, 3.3, 3.4, 6.4_

  - [ ]* 4.6 Écrire les tests de propriété P7 pour la cohérence historique des mutations
    - **Property 7 : Cohérence historique des mutations**
    - Effectuer une série de transferts successifs, vérifier que `endDate[i] == startDate[i+1]` et que seul le dernier enregistrement a `endDate = null`
    - **Validates : Requirements 3.1, 3.2, 3.5**

- [ ] 5. Filtre de cloisonnement et audit
  - [ ] 5.1 Créer `AgencyContext` (ThreadLocal)
    - Créer la classe utilitaire `AgencyContext` avec `setCurrentAgencyId`, `getCurrentAgencyId`, `clear`
    - _Requirements : 4.4_

  - [ ] 5.2 Créer `AgencyScopeFilter`
    - Implémenter `OncePerRequestFilter` (ou `Filter` Spring Security)
    - Extraire `UserDetailsImpl` depuis `SecurityContextHolder`
    - Profil_Global → `chain.doFilter` sans restriction
    - Profil_Terrain sans `agencyId` → logger via `AuditService`, retourner HTTP 401
    - Profil_Terrain avec `agencyId` → `AgencyContext.setCurrentAgencyId(agencyId)` puis `chain.doFilter` puis `AgencyContext.clear()`
    - _Requirements : 4.3, 4.4, 5.1, 9.1_

  - [ ] 5.3 Enrichir `AuditService` pour journaliser les accès refusés
    - Ajouter (ou enrichir) la méthode `logDeniedAccess(Long userId, String url, Long targetAgencyId, LocalDateTime timestamp)`
    - Persister ou logger avec les quatre champs requis
    - _Requirements : 9.4_

  - [ ]* 5.4 Écrire les tests de propriété P4 pour l'isolation des données terrain
    - **Property 4 : Isolation des données terrain**
    - Mocker le contexte de sécurité Profil_Terrain, appeler `clientService.getAllClients()`, vérifier que chaque DTO retourné a `agencyId == agencyId du contexte`
    - **Validates : Requirements 4.1, 4.4, 9.2**

  - [ ]* 5.5 Écrire les tests de propriété P8 pour le rejet d'accès inter-agences
    - **Property 8 : Condition d'erreur — accès inter-agences**
    - Mocker Profil_Terrain agence A1, créer une entité agence A2, vérifier `ResourceNotFoundException` sur `getById` et `AgencyAccessDeniedException` sur `update`
    - **Validates : Requirements 4.2, 4.5, 9.2, 9.3**

  - [ ]* 5.6 Écrire les tests de propriété P5 pour le filtrage global sous-ensemble
    - **Property 5 : Filtrage global sous-ensemble du total**
    - Mocker Profil_Global, comparer `countAll()` vs `countByAgency(agencyId)`, vérifier `filtered <= total`
    - **Validates : Requirements 5.1, 5.2, 5.3**

  - [ ] 5.7 Connecter `AgencyContext` dans les services opérationnels
    - Dans chaque service opérationnel (`ClientService`, `RecoveryService`, `StockService`, etc.), remplacer les requêtes de lecture par des requêtes paramétrées utilisant `AgencyContext.getCurrentAgencyId()`
    - Pour les writes, vérifier que l'`agencyId` du body correspond à `AgencyContext.getCurrentAgencyId()` pour un Profil_Terrain ; sinon retourner HTTP 403
    - Pour les accès par identifiant direct, vérifier l'agence après récupération et retourner 404 si mismatch
    - _Requirements : 4.1, 4.2, 4.5, 9.2_

- [ ] 6. Checkpoint — Tests backend
  - Vérifier que tous les tests unitaires et PBT backend passent (AgencyService, AgencyAssignmentService, AgencyTransferService, JwtUtils, AgencyScopeFilter).
  - Vérifier que le build Spring Boot compile sans erreur.
  - Demander à l'utilisateur si des ajustements sont nécessaires avant de continuer avec les endpoints REST.

- [ ] 7. Contrôleur REST
  - [ ] 7.1 Créer `AgencyController`
    - Annoter `@RestController`, `@RequestMapping("/api/v1/agencies")`, `@PreAuthorize` selon les rôles
    - `POST /` → `agencyService.createAgency(dto)` — ADMIN, SUPER_ADMIN
    - `PUT /{id}` → `agencyService.updateAgency(id, dto)` — ADMIN, SUPER_ADMIN
    - `DELETE /{id}/deactivate` → `agencyService.deactivateAgency(id)` — ADMIN, SUPER_ADMIN
    - `GET /{id}` → `agencyService.getAgencyById(id)` — ADMIN, SUPER_ADMIN
    - `GET /all` → `agencyService.getAllActiveAgencies()` — GESTIONNAIRE, ADMIN, SUPER_ADMIN
    - `GET /{agencyId}/summary` → `agencyService.getAgencySummary(agencyId)` — Profil_Global
    - `POST /users/{userId}/assign` → `assignmentService.assignUserToAgency(…)` — ADMIN, SUPER_ADMIN
    - `POST /users/{userId}/transfer` → `transferService.transferUser(…)` — ADMIN, SUPER_ADMIN
    - `GET /users/{userId}/history` → `assignmentService.getAssignmentHistory(userId)` — ADMIN, SUPER_ADMIN
    - _Requirements : 1.6, 1.7, 1.8, 2.4, 3.6, 5.4, 9.5_

  - [ ] 7.2 Créer les DTOs de requête et réponse
    - `AgencyCreateDto`, `AgencyUpdateDto`, `AgencyDto` (avec nombre d'utilisateurs actifs pour le détail), `AgencySummaryDto`
    - `AgencyAssignmentDto`, `AgencyAssignmentCreateDto`, `AgencyTransferDto`
    - _Requirements : 1.8, 3.7, 5.4_

- [ ] 8. Module mobile — AgencyContextService et modèles
  - [ ] 8.1 Mettre à jour les interfaces TypeScript `User`, `AuthResponse`, `MobileSsoPayload`
    - Ajouter `agencyId?: number | null` dans `auth.model.ts`
    - _Requirements : 6.5, 7.1_

  - [ ] 8.2 Créer `AgencyContextService`
    - Implémenter `getAgencyId(): Promise<number | null>` : source primaire NgRx store, fallback `Preferences`
    - Implémenter `isProfilTerrain(): Promise<boolean>`
    - Implémenter `hasAgencyChanged(previousAgencyId: number | null): Promise<boolean>`
    - _Requirements : 7.1, 7.3, 7.6_

  - [ ] 8.3 Enrichir `AuthService.processAuthResponse()` pour mapper `agencyId`
    - Mapper `response.agencyId ?? null` dans l'objet `User` local
    - Détecter un changement d'agence (`storedUser.agencyId !== user.agencyId`) et positionner le flag `agency_changed` dans les `Preferences`
    - _Requirements : 6.5, 7.6_

- [ ] 9. Module mobile — Intercepteur et initialisation
  - [ ] 9.1 Enrichir `SecurityContextInterceptor` pour injecter `agencyId`
    - Étendre la liste `operationalTargetUrls` (clients, credits, recoveries, tontine, distributions, accounting, orders, expenses, inventory, stock-requests, stock-returns, stock-tontine)
    - Sur POST/PUT/PATCH opérationnel, injecter `agencyId` dans le body via `injectAgency()`
    - Sur les endpoints stock, injecter `collector` + `agencyId` via `injectCollectorAndAgency()`
    - _Requirements : 7.2_

  - [ ] 9.2 Enrichir `DataInitializationService`
    - Injecter `AgencyContextService` dans le constructeur
    - Implémenter `resolveAgencyId()` : lever une erreur applicative si Profil_Terrain sans agencyId
    - Mettre à jour `initializeAllData()` pour appeler `resolveAgencyId()`, détecter `agency_changed` → appeler `purgeLocalDataForAgencyChange()`, puis passer `agencyId` à chaque méthode `initialize*(agencyId?)`
    - Mettre à jour les signatures de `initializeClients`, `initializeRecoveries`, `initializeTontine`, `initializeCommercial`, `initializeStockOutputs`, `initializeCommercialStock`, `initializeDistributions`, `initializeReliquats` pour accepter `agencyId?: number | null`
    - Implémenter `purgeLocalDataForAgencyChange()` : appeler `dbService.clearAllOperationalTables()`
    - _Requirements : 7.1, 7.3, 7.5, 7.6_

  - [ ] 9.3 Passer `agencyId` comme query param dans chaque appel HTTP d'initialisation
    - Modifier chaque appel `GET /clients?username=X` en `GET /clients?username=X&agencyId=Y` si `agencyId` est non null
    - Reproduire pour tous les endpoints utilisés par `DataInitializationService`
    - _Requirements : 7.1, 7.5_

- [ ] 10. Checkpoint final — Tests mobiles et intégration globale
  - Vérifier que tous les tests unitaires Angular/Ionic passent (`AgencyContextService`, `SecurityContextInterceptor`, `DataInitializationService`).
  - Vérifier que les tests d'intégration backend (`AgencyManagementIntegrationTest`, `AgencyTransferIntegrationTest`, `AgencyIsolationIntegrationTest`, `AgencyJwtIntegrationTest`, `MigrationIdempotencyTest`) passent.
  - Demander à l'utilisateur si des ajustements sont nécessaires avant de clore la feature.

---

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être passées pour un MVP rapide.
- Chaque tâche référence les exigences spécifiques pour la traçabilité.
- Les checkpoints (tâches 6 et 10) garantissent une validation incrémentale.
- Les tests de propriété (P1–P8) utilisent **jqwik** côté backend et **fast-check / Jest** côté mobile.
- Les tests unitaires valident les cas spécifiques et les conditions d'erreur.
- La migration Flyway (tâche 1.1) est idempotente et doit être jouée en premier ; toutes les autres tâches en dépendent.
- Le module `backend-lib/common-securities` est modifié par les tâches 3.1–3.5 ; vérifier l'impact sur les autres modules qui l'utilisent.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.2", "2.1", "2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "3.4"] },
    { "id": 4, "tasks": ["3.3", "3.5", "4.1", "4.3", "5.1", "7.2", "8.1"] },
    { "id": 5, "tasks": ["4.2", "4.4", "4.5", "5.2", "5.3", "7.1", "8.2", "8.3"] },
    { "id": 6, "tasks": ["4.6", "5.4", "5.5", "5.6", "9.1", "9.2"] },
    { "id": 7, "tasks": ["5.7", "9.3"] }
  ]
}
```
