# Requirements Document

## Introduction

Cette fonctionnalité — **Dual Credit Authorization** — permet à un client de détenir simultanément deux crédits actifs : un crédit **PERSONNEL** (`PERSONAL`) et un crédit **PROFESSIONNEL** (`BUSINESS`). Sans autorisation explicite d'un manager, la règle d'unicité existante reste en vigueur (un seul crédit en cours par client).

Le second crédit (`BUSINESS`) ne peut être créé que si un manager (rôle `ADMIN` ou `SU`) a préalablement généré un token d'autorisation à usage unique (`DualAuthorizationToken`). Ce token est validé et consommé lors de la création du crédit professionnel. La compatibilité ascendante est garantie : tout crédit existant sans champ `creditPurpose` est automatiquement traité comme `PERSONAL`.

Le système couvre :
- L'ajout d'un champ `creditPurpose` (enum `CreditPurpose : PERSONAL / BUSINESS`) à l'entité `Credit`
- Un nouveau flag `businessCreditInProgress` sur l'entité `Client`
- Un nouveau service et endpoint pour la génération du token d'autorisation manager
- Des migrations Flyway pour les changements de schéma
- Une interface Angular avec sélecteur de finalité et modale d'autorisation manager

---

## Glossary

- **CreditPurpose** : Enum Java définissant la finalité d'un crédit. Valeurs : `PERSONAL` (crédit personnel, comportement par défaut) et `BUSINESS` (crédit professionnel).
- **Credit** : Entité représentant un crédit ou une vente à terme accordé à un client.
- **Client** : Entité représentant un client de type `CLIENT` dans le système.
- **DualAuthorizationToken** : Entité représentant un token d'autorisation à usage unique généré par un manager pour permettre la création d'un crédit BUSINESS simultané.
- **CreditService** : Service Spring gérant la logique de création et de contrôle des crédits.
- **DualCreditAuthorizationService** : Service Spring gérant la génération et la validation des tokens d'autorisation dual-crédit.
- **ClientService** : Service Spring gérant les entités clients, incluant la mise à jour des flags de crédit en cours.
- **CreditRepository** : Repository Spring Data JPA pour les opérations de persistance sur Credit.
- **TokenRepository** : Repository Spring Data JPA pour les opérations de persistance sur DualAuthorizationToken.
- **CreditController** : Contrôleur REST exposant `/api/v1/credits`.
- **AuthorizationController** : Contrôleur REST exposant `/api/v1/credits/dual-authorization`.
- **Manager** : Utilisateur avec rôle `ADMIN` ou `SU` (définis dans `UserProfilConstant`).
- **TTL** : Time-To-Live, durée de validité d'un token (défaut : 30 minutes, configurable).
- **Flyway** : Outil de migration de base de données utilisé dans le projet.
- **creditInProgress** : Flag booléen existant sur `Client` indiquant qu'un crédit `PERSONAL` est en cours.
- **businessCreditInProgress** : Nouveau flag booléen sur `Client` indiquant qu'un crédit `BUSINESS` est en cours.

---

## Requirements

### Requirement 1: Champ creditPurpose et compatibilité ascendante

**User Story:** En tant que système, je veux qu'un champ `creditPurpose` distingue les crédits personnels des crédits professionnels, afin de pouvoir appliquer des règles d'unicité différenciées par finalité tout en restant compatible avec les données existantes.

#### Acceptance Criteria

1. THE `Credit` Entity SHALL expose a `creditPurpose` field of type `CreditPurpose` enum with allowed values `PERSONAL` and `BUSINESS`.
2. THE `Credit` Entity SHALL use `PERSONAL` as the default value when `creditPurpose` is not provided.
3. WHEN a `Credit` entity is processed with a null `creditPurpose`, THE `CreditService` SHALL treat it as `PERSONAL` for all in-memory business rule evaluations without writing back the resolved value to the database.
4. WHEN the Flyway migration runs, THE Database SHALL set `credit_purpose = 'PERSONAL'` for all existing `Credit` records where `credit_purpose` is null.
5. WHEN the Flyway migration runs, THE Database SHALL add a `manager_authorization_token` column of type `VARCHAR(255)` (nullable) to the `credit` table.
6. THE Flyway migration SHALL only add new columns or update null values; it SHALL NOT delete, overwrite non-null data, or alter the type of any existing column in the `credit` table.
7. IF the Flyway migration fails, THE Database SHALL rollback all changes from that migration script, leaving the schema unchanged.

---

### Requirement 2: Règle d'unicité par finalité (creditPurpose)

**User Story:** En tant que gestionnaire de crédit, je veux que le système empêche la création d'un second crédit de même finalité pour un client, afin de garantir qu'un client n'a jamais plus d'un crédit PERSONAL en cours et jamais plus d'un crédit BUSINESS en cours.

#### Acceptance Criteria

1. WHEN a `Credit` creation request is received for a `CLIENT`-type client with `creditPurpose = PERSONAL`, THE `CreditService` SHALL verify that no `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for that client.
2. IF a `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` already exists for the client, THEN THE `CreditService` SHALL throw a `CustomValidationException` whose message identifies both the client and the `PERSONAL` purpose, and SHALL prevent the creation.
3. WHEN a `Credit` creation request is received for a `CLIENT`-type client with `creditPurpose = BUSINESS`, THE `CreditService` SHALL verify that no `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for that client.
4. IF a `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` already exists for the client, THEN THE `CreditService` SHALL throw a `CustomValidationException` whose message identifies both the client and the `BUSINESS` purpose, and SHALL prevent the creation.
5. THE `CreditService` SHALL permit the simultaneous existence of at most one `PERSONAL` credit and at most one `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` for the same client, for a maximum of two concurrent active credits per client.
6. WHEN the `clientType` is not `CLIENT`, THE `CreditService` SHALL NOT throw a `CustomValidationException` on the basis of `creditPurpose` and SHALL apply existing pre-existing uniqueness rules unchanged.

---

### Requirement 3: Autorisation manager — génération du token

**User Story:** En tant que manager, je veux pouvoir générer un token d'autorisation à usage unique pour un client spécifique, afin de permettre la création d'un crédit professionnel simultané pour ce client.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/credits/dual-authorization` request is received with manager credentials and a `clientId`, THE `AuthorizationController` SHALL invoke `DualCreditAuthorizationService.generateManagerAuthorizationToken`.
2. IF the provided `clientId` does not correspond to an existing client record, THEN THE `DualCreditAuthorizationService` SHALL throw an exception and the response SHALL indicate that the client was not found.
3. IF the provided `managerUsername` does not correspond to an existing user, THEN THE `DualCreditAuthorizationService` SHALL throw an exception and the response SHALL indicate that the credentials are invalid without disclosing which field was incorrect.
4. IF the provided `managerPassword` does not match the stored password hash for the given `managerUsername`, THEN THE `DualCreditAuthorizationService` SHALL throw an exception and the response SHALL indicate that the credentials are invalid without disclosing which field was incorrect.
5. WHEN the manager credentials are valid, THE `DualCreditAuthorizationService` SHALL verify that the authenticated user has role `ADMIN` or `SU`.
6. IF the authenticated user does not have role `ADMIN` or `SU`, THEN THE `DualCreditAuthorizationService` SHALL throw an exception indicating that manager-level authorization is required, and SHALL prevent token generation.
7. WHEN all validations pass, THE `DualCreditAuthorizationService` SHALL generate a UUID v4 token that is unique across all existing `DualAuthorizationToken` records, persist a `DualAuthorizationToken` record with `clientId`, `authorizedBy` set to the authenticated manager's username, `expiresAt = now() + TTL`, and `consumed = false`.
8. THE `DualCreditAuthorizationService` SHALL return a `DualAuthorizationTokenDto` containing the generated `token`, the `clientId`, and the `expiresAt` timestamp.
9. THE `AuthorizationController` SHALL return HTTP 201 with the `DualAuthorizationTokenDto` upon successful token generation.
10. THE system SHALL allow the TTL duration to be modified via configuration without requiring a code change; the default value SHALL be 30 minutes.

---

### Requirement 4: Autorisation manager — validation et consommation du token

**User Story:** En tant que système, je veux valider et consommer le token d'autorisation lors de la création d'un crédit BUSINESS simultané, afin de garantir que chaque autorisation manager n'est utilisée qu'une seule fois.

#### Acceptance Criteria

1. WHEN a `Credit` creation request contains `creditPurpose = BUSINESS` and a `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` is already active for the client, THE `CreditService` SHALL require a non-empty `managerAuthorizationToken` in the request.
2. IF `creditPurpose = BUSINESS`, a `PERSONAL` credit is in progress, and `managerAuthorizationToken` is absent or empty, THEN THE `CreditService` SHALL throw a `CustomValidationException` with message `"Une autorisation manager est requise pour créer un crédit professionnel simultané."`.
3. WHEN validating a token, THE `TokenRepository` SHALL look up the `DualAuthorizationToken` by both `clientId` and `token` value.
4. IF no `DualAuthorizationToken` matching both `clientId` and `token` is found, THEN THE `DualCreditAuthorizationService` SHALL throw a `CustomValidationException` with message `"Token invalide ou inexistant."`.
5. IF `now() >= token.expiresAt`, THEN THE `DualCreditAuthorizationService` SHALL throw a `CustomValidationException` with message `"Le token d'autorisation a expiré."`, regardless of the `consumed` state; this check SHALL be performed before the consumed check.
6. IF the matching token has `consumed = true` and `now() < token.expiresAt`, THEN THE `DualCreditAuthorizationService` SHALL throw a `CustomValidationException` with message `"Ce token d'autorisation a déjà été utilisé."`.
7. WHEN the token passes all validations (exists, not expired, not consumed), THE `DualCreditAuthorizationService` SHALL set `consumed = true` and `consumedAt = now()` on the token and persist the update atomically.
8. WHEN the token is successfully consumed, THE `CreditService` SHALL proceed with the creation of the `BUSINESS` credit.
9. IF credit creation fails after token consumption, THE token SHALL remain consumed and the caller SHALL receive an error indicating that a new token must be obtained.

---

### Requirement 5: Crédit BUSINESS sans PERSONAL actif

**User Story:** En tant qu'agent de crédit, je veux pouvoir créer un crédit BUSINESS pour un client qui n'a pas de crédit PERSONAL en cours, sans avoir besoin d'une autorisation manager, afin de ne pas imposer de frictions inutiles.

#### Acceptance Criteria

1. WHEN a `Credit` creation request with `creditPurpose = BUSINESS` is received and no `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for the client, THE `CreditService` SHALL NOT require a `managerAuthorizationToken` and SHALL NOT reject the request due to its absence.
2. WHEN a `Credit` creation request with `creditPurpose = BUSINESS` is received and no `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for the client, THE `CreditService` SHALL accept and ignore any `managerAuthorizationToken` value that may be present in the request without consuming it.
3. IF a `Credit` creation request with `creditPurpose = BUSINESS` is received and a `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` already exists for the client, THEN THE `CreditService` SHALL throw a `CustomValidationException` identifying the duplicate BUSINESS credit, regardless of whether a `PERSONAL` credit is also in progress.

---

### Requirement 6: Mise à jour du flag Client

**User Story:** En tant que système, je veux maintenir les flags `creditInProgress` et `businessCreditInProgress` sur l'entité `Client` synchronisés avec l'état réel des crédits en cours, afin que les interfaces et requêtes puissent connaître rapidement l'état d'un client.

#### Acceptance Criteria

1. THE `Client` Entity SHALL expose a `businessCreditInProgress` boolean field with default value `false`.
2. THE Flyway migration SHALL add a `business_credit_in_progress` column of type `BOOLEAN DEFAULT FALSE NOT NULL` to the `client` table.
3. WHEN a `PERSONAL` credit is persisted to the database for a client, THE `ClientService` SHALL set `client.creditInProgress = true` for that client.
4. WHEN a `BUSINESS` credit is persisted to the database for a client, THE `ClientService` SHALL set `client.businessCreditInProgress = true` for that client.
5. WHEN a `PERSONAL` credit reaches status `SETTLED` or is soft-deleted (`state = DISABLED`) and no other `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` remains for that client, THE `ClientService` SHALL set `client.creditInProgress = false`.
6. WHEN a `BUSINESS` credit reaches status `SETTLED` or is soft-deleted (`state = DISABLED`) and no other `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` remains for that client, THE `ClientService` SHALL set `client.businessCreditInProgress = false`.
7. WHILE at least one `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for a client, THE `Client` Entity SHALL have `businessCreditInProgress = true`.
8. IF the `Credit` entity being created or modified has `creditPurpose = PERSONAL` or `creditPurpose = null`, THEN THE `ClientService` SHALL update `creditInProgress` and SHALL NOT modify `businessCreditInProgress`.

---

### Requirement 7: Entité DualAuthorizationToken et persistance

**User Story:** En tant que système, je veux persister les tokens d'autorisation manager avec leurs métadonnées, afin de garantir la traçabilité des autorisations et de permettre la validation des tokens lors de la création de crédit.

#### Acceptance Criteria

1. THE `DualAuthorizationToken` Entity SHALL persist the following fields: `id` (Long, PK), `clientId` (Long, NOT NULL), `token` (String, UNIQUE NOT NULL), `authorizedBy` (String, NOT NULL), `expiresAt` (LocalDateTime, NOT NULL), `consumed` (boolean, NOT NULL, default false), `consumedAt` (LocalDateTime, nullable), `createdDate`, `lastModifiedDate`, `createdBy`, `lastModifiedBy`, `state`.
2. THE Database SHALL enforce a UNIQUE constraint on the `token` column of the `dual_authorization_token` table.
3. THE Flyway migration SHALL create the `dual_authorization_token` table with all columns listed in criterion 1, with NOT NULL constraints on `client_id`, `token`, `authorized_by`, `expires_at`, and `consumed`.
4. THE Database SHALL create an index on `(client_id, token)` on the `dual_authorization_token` table to optimize lookup queries.
5. WHEN a `DualAuthorizationToken` has `consumed = true` and its `consumedAt` timestamp is more than 24 hours in the past, THE System SHALL support scheduled purging of that record.
6. WHEN a `DualAuthorizationToken` has `consumed = false` and its `expiresAt` timestamp is more than 24 hours in the past, THE System SHALL support scheduled purging of that record.
7. THE `DualAuthorizationToken` record SHALL be retained until the scheduled purge to enable audit of who authorized the dual credit, for which client, and at what time.

---

### Requirement 8: Interface frontend Angular

**User Story:** En tant qu'agent de crédit, je veux une interface claire pour sélectionner la finalité du crédit et obtenir une autorisation manager si nécessaire, afin de guider le processus de création d'un crédit professionnel simultané.

#### Acceptance Criteria

1. WHEN a user creates a credit of type `CREDIT` (à terme) in the Angular frontend, THE Credit Form SHALL display a `creditPurpose` selector with options `PERSONAL` (Personnel) and `BUSINESS` (Professionnel).
2. WHEN `creditPurpose = BUSINESS` is selected and the system determines that the client has a `PERSONAL` credit in progress, THE Credit Form SHALL display a manager authorization warning block with a button to trigger the authorization modal.
3. WHEN the user clicks the authorization button, THE Credit Form SHALL open a manager authorization modal prompting for manager username and password.
4. WHEN the manager credentials are submitted via the modal and the API call to `POST /api/v1/credits/dual-authorization` succeeds, THE Credit Form SHALL store the returned token in the form state and close the modal.
5. WHEN the API call to `POST /api/v1/credits/dual-authorization` fails, THE Credit Form SHALL display the error message returned by the API inside the modal without closing it, allowing the user to correct the credentials.
6. WHEN a valid manager token is stored in the form state, THE Credit Form SHALL display a visual success indicator (e.g., a green badge) confirming the authorization and SHALL hide the authorization warning button.
7. WHEN the credit creation form is submitted, THE Credit Form SHALL include `creditPurpose` in the `CreditDto` payload; IF a `managerAuthorizationToken` is stored in the form state, it SHALL also be included.
8. IF `creditPurpose = BUSINESS` is selected, the client has a `PERSONAL` credit in progress, and no valid `managerAuthorizationToken` is stored in the form state, THEN THE Credit Form SHALL prevent form submission and display a message indicating that manager authorization is required.
9. IF `creditPurpose` is not selected by the user, THE Credit Form SHALL default to `PERSONAL` in the submitted payload.

---

### Requirement 9: Endpoints REST et contrats d'API

**User Story:** En tant que développeur frontend, je veux des contrats d'API clairs et stables pour la création de crédits et la génération de tokens d'autorisation, afin d'intégrer facilement les nouveaux flux dans l'interface Angular.

#### Acceptance Criteria

1. THE `CreditController` SHALL expose `POST /api/v1/credits` accepting a `CreditDto` that includes optional fields `creditPurpose` (enum `CreditPurpose`) and `managerAuthorizationToken` (String).
2. THE `AuthorizationController` SHALL expose `POST /api/v1/credits/dual-authorization` accepting a `ManagerAuthorizationRequest` with fields `clientId` (non-null), `managerUsername` (non-blank), and `managerPassword` (non-blank).
3. WHEN a credit creation fails because a credit of the same `creditPurpose` is already in progress for the client, THE `CreditController` SHALL return HTTP 400 with an error message that identifies the conflicting `creditPurpose`.
4. WHEN a credit creation fails because `managerAuthorizationToken` is absent and one is required, THE `CreditController` SHALL return HTTP 400 with an error message indicating that manager authorization is required.
5. WHEN a credit creation fails because the provided `managerAuthorizationToken` is invalid, expired, or already consumed, THE `CreditController` SHALL return HTTP 400 with an error message that identifies the specific token rejection reason.
6. WHEN token generation fails because the authenticated user lacks the required role, THE `AuthorizationController` SHALL return HTTP 400 with an error message indicating that manager-level authorization is required.
7. WHEN token generation fails because the provided credentials are invalid, THE `AuthorizationController` SHALL return HTTP 400 with an error message indicating invalid credentials without revealing which field was incorrect.
8. WHEN an HTTPS request is not used for `POST /api/v1/credits/dual-authorization`, THE server SHALL reject the connection; the endpoint SHALL NOT be reachable over plain HTTP.

---

### Requirement 10: Performance et index de base de données

**User Story:** En tant qu'administrateur système, je veux que les requêtes de vérification d'unicité par finalité soient optimisées, afin que la création de crédits ne dégrade pas les performances globales même avec un volume important de données.

#### Acceptance Criteria

1. THE Flyway migration SHALL create an index `idx_credit_client_purpose_status` on columns `(client_id, credit_purpose, status, state)` of the `credit` table.
2. IF the system needs to display whether a client has an active BUSINESS credit, THEN THE `ClientService` SHALL read the `businessCreditInProgress` flag from the `Client` entity instead of executing a count query against the `credit` table.
3. WHEN the `CreditRepository` checks for an active credit by purpose, THE `CreditRepository` SHALL use the query `countByClientIdAndPurposeAndStatusIn` scoped to `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED`, leveraging the composite index `idx_credit_client_purpose_status`.
4. WHEN a `BUSINESS` credit reaches `SETTLED` status or is soft-deleted, THE `ClientService` SHALL set `client.businessCreditInProgress = false` so that subsequent display operations do not require a count query.
