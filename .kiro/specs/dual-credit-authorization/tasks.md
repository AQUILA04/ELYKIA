# Implementation Plan: Dual Credit Authorization

## Overview

Implémentation incrémentale du système d'autorisation dual-crédit : migration Flyway → entités/enums backend → repositories → service d'autorisation → modification de CreditService/ClientService → nouveaux endpoints REST → interface Angular → tests PBT et unitaires → purge planifiée.

## Tasks

- [ ] 1. Migration Flyway et schéma de base de données
  - [ ] 1.1 Créer le script Flyway `V{n}__add_dual_credit_authorization.sql`
    - Ajouter `credit_purpose VARCHAR(20) DEFAULT 'PERSONAL' NOT NULL` et `manager_authorization_token VARCHAR(255)` à la table `credit`
    - Exécuter `UPDATE credit SET credit_purpose = 'PERSONAL' WHERE credit_purpose IS NULL`
    - Ajouter `business_credit_in_progress BOOLEAN DEFAULT FALSE NOT NULL` à la table `client`
    - Créer la table `dual_authorization_token` avec toutes ses colonnes (id, client_id, token UNIQUE, authorized_by, expires_at, consumed, consumed_at, audit fields, state)
    - Créer l'index composite `idx_credit_client_purpose_status` sur `credit(client_id, credit_purpose, status, state)`
    - Créer l'index `idx_dual_token_client_token` sur `dual_authorization_token(client_id, token)`
    - _Requirements: 1.4, 1.5, 1.6, 6.2, 7.3, 7.4, 10.1_

- [ ] 2. Entités et enum backend
  - [ ] 2.1 Créer l'enum `CreditPurpose`
    - Créer `CreditPurpose.java` avec valeurs `PERSONAL` et `BUSINESS`
    - Documenter que `null` doit être traité comme `PERSONAL` en logique applicative
    - _Requirements: 1.1, 1.2_

  - [ ] 2.2 Mettre à jour l'entité `Credit`
    - Ajouter le champ `creditPurpose` annoté `@Enumerated(EnumType.STRING)` avec `columnDefinition = "VARCHAR(20) DEFAULT 'PERSONAL'"` et valeur par défaut `CreditPurpose.PERSONAL`
    - Ajouter le champ `managerAuthorizationToken` de type `String` (nullable)
    - _Requirements: 1.1, 1.5_

  - [ ] 2.3 Mettre à jour l'entité `Client`
    - Ajouter le champ `businessCreditInProgress` de type `boolean` avec `columnDefinition = "boolean default false"` et valeur par défaut `false`
    - _Requirements: 6.1, 6.2_

  - [ ] 2.4 Créer l'entité `DualAuthorizationToken`
    - Créer `DualAuthorizationToken.java` étendant `Auditable<String>`
    - Champs : `id` (Long PK, @GeneratedValue), `clientId` (Long), `token` (String, unique), `authorizedBy` (String), `expiresAt` (LocalDateTime), `consumed` (boolean, défaut false), `consumedAt` (LocalDateTime, nullable)
    - Annoter `@Entity`, `@Table(name = "dual_authorization_token")`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 3. Repositories
  - [ ] 3.1 Mettre à jour `CreditRepository`
    - Ajouter la méthode `@Query` `countByClientIdAndPurposeAndStatusIn(Long clientId, CreditPurpose purpose, List<CreditStatus> statuses, State state)`
    - Ajouter la méthode default `hasCreditInProgressForPurpose(Long clientId, CreditPurpose purpose)` qui appelle `countByClientIdAndPurposeAndStatusIn` avec les statuts `INPROGRESS, CREATED, VALIDATED` et `state = ENABLED`
    - Mettre à jour `hasCreditInProgress(Long clientId)` pour déléguer vers `hasCreditInProgressForPurpose` afin de couvrir les deux purposes
    - _Requirements: 2.1, 2.3, 10.3_

  - [ ] 3.2 Créer `DualAuthorizationTokenRepository`
    - Créer l'interface étendant `JpaRepository<DualAuthorizationToken, Long>`
    - Ajouter `findByClientIdAndToken(Long clientId, String token) : Optional<DualAuthorizationToken>`
    - _Requirements: 4.3, 7.4_

- [ ] 4. DTOs et modèles de requête/réponse
  - [ ] 4.1 Mettre à jour `CreditDto`
    - Ajouter le champ `creditPurpose` de type `CreditPurpose` (nullable)
    - Ajouter le champ `managerAuthorizationToken` de type `String` (nullable)
    - _Requirements: 9.1_

  - [ ] 4.2 Créer `ManagerAuthorizationRequest`
    - Créer le DTO avec champs `clientId` (`@NotNull`), `managerUsername` (`@NotBlank`), `managerPassword` (`@NotBlank`)
    - _Requirements: 9.2_

  - [ ] 4.3 Créer `DualAuthorizationTokenDto`
    - Créer le record avec champs `token` (String), `clientId` (Long), `expiresAt` (LocalDateTime)
    - _Requirements: 3.8_

- [ ] 5. Service DualCreditAuthorizationService
  - [ ] 5.1 Créer l'interface `DualCreditAuthorizationService`
    - Déclarer `generateManagerAuthorizationToken(ManagerAuthorizationRequest request) : DualAuthorizationTokenDto`
    - Déclarer `validateAndConsumeToken(Long clientId, String token) : void`
    - Déclarer `clientRequiresAuthorizationForNewCredit(Long clientId, CreditPurpose purpose) : boolean`
    - _Requirements: 3.1, 4.1_

  - [ ] 5.2 Implémenter `DualCreditAuthorizationServiceImpl`
    - Implémenter `generateManagerAuthorizationToken` : recherche et authentification du manager via `UserService` + `PasswordEncoder`, vérification du rôle `ADMIN` ou `SU`, génération d'un UUID v4, persistance du `DualAuthorizationToken` avec `expiresAt = now() + TOKEN_TTL`, retour du `DualAuthorizationTokenDto`
    - Lire le TTL depuis la configuration Spring (`@Value`, défaut 30 minutes)
    - Lire le TTL depuis la configuration Spring (`@Value`, défaut 30 minutes) - _Requirements: 3.10_
    - Implémenter `validateAndConsumeToken` : lookup par `(clientId, token)`, vérification de l'expiration (avant la vérification consumed), vérification du consumed, mise à jour atomique consumed=true et consumedAt=now()
    - Implémenter `clientRequiresAuthorizationForNewCredit` : `purpose = BUSINESS` ET `hasCreditInProgressForPurpose(clientId, PERSONAL) = true`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.3 Écrire les tests unitaires pour `DualCreditAuthorizationServiceImpl`
    - `generateToken_nonAdminUser_throws()`
    - `generateToken_invalidPassword_throws()`
    - `generateToken_unknownUser_throws()`
    - `generateToken_adminUser_succeeds_andPersistsToken()`
    - `validateToken_notFound_throws()`
    - `validateToken_expired_throws()`
    - `validateToken_consumed_throws()`
    - `validateToken_valid_setsConsumedTrueAndConsumedAt()`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 6. Modification de ClientService
  - [ ] 6.1 Mettre à jour `updateClientCreditStatus` dans `ClientService`
    - Modifier la signature pour accepter `CreditPurpose purpose` en paramètre
    - Si `purpose = PERSONAL` ou `null` → mettre à jour `client.creditInProgress`
    - Si `purpose = BUSINESS` → mettre à jour `client.businessCreditInProgress`
    - Ne jamais modifier le flag de l'autre purpose dans un même appel
    - Mettre à jour tous les appelants existants de `updateClientCreditStatus` pour passer le bon `CreditPurpose`
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 6.2 Écrire les tests unitaires pour `ClientService`
    - `updateCreditStatus_PERSONAL_updatesCreditInProgress_only()`
    - `updateCreditStatus_BUSINESS_updatesBusinessCreditInProgress_only()`
    - `updateCreditStatus_nullPurpose_updatesCreditInProgress()`
    - _Requirements: 6.3, 6.4, 6.8_

- [ ] 7. Modification de CreditService
  - [ ] 7.1 Mettre à jour `createCredit` dans `CreditService`
    - Si `credit.creditPurpose` est null, assigner `CreditPurpose.PERSONAL` avant les contrôles
    - Appeler `updateClientCreditStatus(clientId, credit.creditPurpose, true)` au lieu de l'ancienne signature
    - _Requirements: 1.2, 1.3, 6.3, 6.4_

  - [ ] 7.2 Mettre à jour `creditUnicity` dans `CreditService`
    - Ignorer la vérification pour les clients de type != `CLIENT` (comportement inchangé)
    - Résoudre `purpose = credit.creditPurpose ?? PERSONAL`
    - Vérifier `hasCreditInProgressForPurpose(clientId, purpose)` → lever `CustomValidationException` si vrai
    - Si `purpose = BUSINESS` ET `hasCreditInProgressForPurpose(clientId, PERSONAL) = true` :
      - Lever `CustomValidationException("Une autorisation manager est requise...")` si token absent/vide
      - Appeler `dualCreditAuthorizationService.validateAndConsumeToken(clientId, token)` sinon
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 5.1, 5.2, 5.3_

  - [ ]* 7.3 Écrire les tests unitaires pour `CreditService`
    - `createCredit_withNullPurpose_defaultsToPERSONAL()`
    - `creditUnicity_PERSONAL_alreadyInProgress_throws()`
    - `creditUnicity_BUSINESS_alreadyInProgress_throws()`
    - `creditUnicity_BUSINESS_withValidToken_succeeds()`
    - `creditUnicity_BUSINESS_withoutToken_personalInProgress_throws()`
    - `creditUnicity_BUSINESS_noPersonalInProgress_noTokenRequired()`
    - `creditUnicity_BUSINESS_noPersonalInProgress_tokenPresent_notConsumed()`
    - `creditUnicity_nonClientType_skipsCheck()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 5.1, 5.2, 5.3_

- [ ] 8. Checkpoint — vérifier que tous les tests unitaires backend passent
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Tests par propriétés (PBT) avec jqwik
  - [ ]* 9.1 Écrire le test PBT pour Property 1 — Unicité par purpose
    - **Property 1: Unicité par purpose**
    - Pour tout `CreditPurpose` et tout `clientId`, une deuxième tentative de création du même purpose lève toujours `CustomValidationException`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 9.2 Écrire le test PBT pour Property 4 — Token usage unique
    - **Property 4: Token usage unique**
    - Pour tout token consommé, toute tentative de validation ultérieure lève `CustomValidationException`
    - **Validates: Requirements 4.5, 4.7**

  - [ ]* 9.3 Écrire le test PBT pour Property 5 — Token expiration
    - **Property 5: Token expiration**
    - Pour tout délai supérieur au TTL, la validation échoue quel que soit l'état consumed
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 9.4 Écrire le test PBT pour Property 6 — Autorisation exclusive manager
    - **Property 6: Autorisation exclusive manager**
    - Tout utilisateur avec un rôle ∉ `{ADMIN, SU}` reçoit une erreur lors de la génération du token
    - **Validates: Requirements 3.4, 3.5, 3.6**

  - [ ]* 9.5 Écrire le test PBT pour Property 8 — Crédit BUSINESS sans PERSONAL actif
    - **Property 8: Crédit BUSINESS sans PERSONAL actif ne nécessite pas de token**
    - Sans crédit PERSONAL en cours, la création BUSINESS réussit sans token quelle que soit la valeur du champ
    - **Validates: Requirements 5.1, 5.2**

- [ ] 10. Contrôleurs REST
  - [ ] 10.1 Créer `AuthorizationController`
    - Créer le contrôleur `@RestController` mappé sur `/api/v1/credits`
    - Exposer `POST /dual-authorization` acceptant `@Valid @RequestBody ManagerAuthorizationRequest`
    - Déléguer vers `DualCreditAuthorizationService.generateManagerAuthorizationToken`
    - Retourner HTTP 201 avec `DualAuthorizationTokenDto`
    - _Requirements: 3.1, 3.9, 9.2, 9.6, 9.7, 9.8_

  - [ ] 10.2 Mettre à jour `CreditController`
    - S'assurer que `CreditDto` (avec les nouveaux champs `creditPurpose` et `managerAuthorizationToken`) est correctement désérialisé depuis le payload JSON `POST /api/v1/credits`
    - Vérifier que les réponses d'erreur 400 exposent bien les messages de `CustomValidationException`
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

- [ ] 11. Checkpoint — vérifier le flux backend end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Test d'intégration backend
  - [ ]* 12.1 Écrire `DualCreditAuthorizationIntegrationTest`
    - Scénario complet : génération du token → création crédit PERSONAL → création crédit BUSINESS avec token → vérification des flags client
    - Vérifier que le token est bien marqué consumed après utilisation
    - Vérifier que `hasCreditInProgressForPurpose` retourne les bonnes valeurs après chaque opération
    - _Requirements: 4.7, 4.8, 6.3, 6.4, 7.1_

  - [ ]* 12.2 Écrire `CreditRepositoryTest` pour `hasCreditInProgressForPurpose`
    - Valider les requêtes JPA par purpose avec données de test en base H2/Testcontainers
    - _Requirements: 2.1, 2.3, 10.3_

- [ ] 13. Interface Angular — formulaire de création de crédit
  - [ ] 13.1 Ajouter le sélecteur `creditPurpose` au formulaire `credit-add`
    - Ajouter un radio button group `PERSONAL` / `BUSINESS` visible uniquement si `saleType === 'CREDIT'`
    - Brancher `formControlName="creditPurpose"` sur le `ReactiveForm` existant
    - Définir `PERSONAL` comme valeur par défaut du contrôle
    - _Requirements: 8.1, 8.9_

  - [ ] 13.2 Implémenter la détection de la nécessité d'autorisation
    - Calculer `requiresManagerAuthorization` : `creditPurpose === 'BUSINESS'` ET `client.creditInProgress === true`
    - Afficher le bloc d'avertissement `alert-warning` conditionné à `requiresManagerAuthorization`
    - _Requirements: 8.2_

  - [ ] 13.3 Implémenter la modale d'autorisation manager
    - Créer ou utiliser un composant modal demandant `managerUsername` et `managerPassword`
    - Au submit, appeler `POST /api/v1/credits/dual-authorization`
    - En cas de succès : stocker le token dans l'état du formulaire, afficher le badge vert, fermer la modale
    - En cas d'erreur : afficher le message d'erreur API dans la modale sans la fermer
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

  - [ ] 13.4 Implémenter le guard de soumission du formulaire
    - Empêcher la soumission si `requiresManagerAuthorization && !managerAuthorizationToken`
    - Afficher un message demandant l'autorisation manager dans ce cas
    - Inclure `creditPurpose` dans le payload `CreditDto` à chaque soumission
    - Inclure `managerAuthorizationToken` dans le payload si présent dans l'état
    - _Requirements: 8.7, 8.8_

- [ ] 14. Purge planifiée des tokens expirés/consommés
  - [ ] 14.1 Créer le job de purge `DualAuthorizationTokenPurgeJob`
    - Créer un `@Scheduled` Spring component (ou `@Component` avec `@EnableScheduling`)
    - Ajouter une méthode de suppression dans `DualAuthorizationTokenRepository` : supprimer les tokens où (`consumed = true` ET `consumedAt < now() - 24h`) OU (`consumed = false` ET `expiresAt < now() - 24h`)
    - Configurer le cron via `@Value` pour permettre l'ajustement sans recompilation
    - _Requirements: 7.5, 7.6, 7.7_

- [ ] 15. Checkpoint final — tous les tests passent
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être différées pour un MVP rapide
- Les propriétés PBT (tâches 9.x) nécessitent jqwik dans `pom.xml` — vérifier sa présence avant d'implémenter
- L'ordre 1→2→3→4→5→6→7 garantit qu'aucun code en aval ne référence des symboles non encore définis
- Les tâches 7.1 et 7.2 dépendent de 3.1, 5.2 et 6.1 : ne pas les implémenter avant
- La tâche 10.1 (AuthorizationController) ne dépend pas de 10.2 — parallélisables
- Toute `CustomValidationException` doit conserver le pattern déjà en place dans le projet
- La compatibilité ascendante est garantie par la migration Flyway (tâche 1.1) avant tout changement de code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "4.2", "4.3"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["3.1", "3.2", "4.1"] },
    { "id": 4, "tasks": ["5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "6.2"] },
    { "id": 6, "tasks": ["5.3", "7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3", "10.1", "10.2"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "12.2"] },
    { "id": 9, "tasks": ["12.1", "13.1"] },
    { "id": 10, "tasks": ["13.2", "13.3"] },
    { "id": 11, "tasks": ["13.4", "14.1"] }
  ]
}
```
