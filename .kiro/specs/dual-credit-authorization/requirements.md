# Requirements Document

## Introduction

Cette fonctionnalité — **Dual Credit Authorization** — permet à un client de détenir simultanément deux crédits actifs : un crédit **PERSONNEL** (`PERSONAL`) et un crédit **PROFESSIONNEL** (`BUSINESS`).

L'autorisation du crédit professionnel est **préalable et persistante** : seul un **GESTIONNAIRE** peut habiliter un client via une action dédiée sur la liste ou la fiche client. Une fois habilité, le client est marqué comme autorisé à contracter un crédit business. Lors de la création d'une vente à crédit, si le client est habilité, l'agent choisit la finalité (personnel ou professionnel). Le backend valide l'habilitation, l'absence de crédit business en cours et les règles d'unicité par finalité.

**Règle Option A** : tout crédit `BUSINESS` exige que le client soit préalablement habilité (`businessCreditAuthorized = true`), qu'un crédit `PERSONAL` soit ou non en cours.

Sans habilitation business, la règle d'unicité existante reste en vigueur (un seul crédit en cours par client, traité comme `PERSONAL`).

La compatibilité ascendante est garantie : tout crédit existant sans champ `creditPurpose` est automatiquement traité comme `PERSONAL`.

Le système couvre :
- L'ajout d'un champ `creditPurpose` (enum `CreditPurpose : PERSONAL / BUSINESS`) à l'entité `Credit`
- L'habilitation business persistante sur l'entité `Client` (`businessCreditAuthorized`, traçabilité de l'habilitation courante)
- Un historique immuable des habilitations et révocations (`BusinessCreditAuthorizationEvent`)
- Un nouveau flag `businessCreditInProgress` sur l'entité `Client`
- Des endpoints REST pour habiliter / révoquer l'habilitation business et consulter l'historique
- Des migrations Flyway pour les changements de schéma
- Une interface Angular avec action gestionnaire sur les clients, historique des habilitations et sélecteur de finalité conditionnel à la création de vente

---

## Glossary

- **CreditPurpose** : Enum Java définissant la finalité d'un crédit. Valeurs : `PERSONAL` (crédit personnel, comportement par défaut) et `BUSINESS` (crédit professionnel).
- **Credit** : Entité représentant un crédit ou une vente à terme accordé à un client.
- **Client** : Entité représentant un client de type `CLIENT` dans le système.
- **businessCreditAuthorized** : Flag booléen sur `Client` indiquant que le client est actuellement habilité à contracter un crédit professionnel.
- **businessCreditInProgress** : Flag booléen sur `Client` indiquant qu'un crédit `BUSINESS` est en cours.
- **BusinessCreditAuthorizationEvent** : Entité d'historique immuable enregistrant chaque habilitation (`AUTHORIZED`) ou révocation (`REVOKED`) business, avec auteur et horodatage.
- **BusinessCreditAuthorizationAction** : Enum des actions d'historique. Valeurs : `AUTHORIZED`, `REVOKED`.
- **CreditService** : Service Spring gérant la logique de création et de contrôle des crédits.
- **ClientService** : Service Spring gérant les entités clients, incluant l'habilitation business et la mise à jour des flags de crédit en cours.
- **CreditRepository** : Repository Spring Data JPA pour les opérations de persistance sur Credit.
- **CreditController** : Contrôleur REST exposant `/api/v1/credits`.
- **ClientController** : Contrôleur REST exposant `/api/v1/clients`.
- **Gestionnaire** : Utilisateur avec le profil `GESTIONNAIRE` (constante `UserProfilConstant.GESTIONNAIRE`, rôle Spring `ROLE_VALIDATE_CREDIT`).
- **Flyway** : Outil de migration de base de données utilisé dans le projet.
- **creditInProgress** : Flag booléen existant sur `Client` indiquant qu'un crédit `PERSONAL` est en cours.

---

## Requirements

### Requirement 1: Champ creditPurpose et compatibilité ascendante

**User Story:** En tant que système, je veux qu'un champ `creditPurpose` distingue les crédits personnels des crédits professionnels, afin de pouvoir appliquer des règles d'unicité différenciées par finalité tout en restant compatible avec les données existantes.

#### Acceptance Criteria

1. THE `Credit` Entity SHALL expose a `creditPurpose` field of type `CreditPurpose` enum with allowed values `PERSONAL` and `BUSINESS`.
2. THE `Credit` Entity SHALL use `PERSONAL` as the default value when `creditPurpose` is not provided.
3. WHEN a `Credit` entity is processed with a null `creditPurpose`, THE `CreditService` SHALL treat it as `PERSONAL` for all in-memory business rule evaluations without writing back the resolved value to the database.
4. WHEN the Flyway migration runs, THE Database SHALL set `credit_purpose = 'PERSONAL'` for all existing `Credit` records where `credit_purpose` is null.
5. THE Flyway migration SHALL only add new columns or update null values; it SHALL NOT delete, overwrite non-null data, or alter the type of any existing column in the `credit` table.
6. IF the Flyway migration fails, THE Database SHALL rollback all changes from that migration script, leaving the schema unchanged.

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

### Requirement 3: Habilitation business — autorisation par le GESTIONNAIRE

**User Story:** En tant que GESTIONNAIRE, je veux habiliter un client à contracter un crédit professionnel depuis la liste ou la fiche client, afin que les agents puissent ensuite créer des ventes business pour ce client sans interruption de flux.

#### Acceptance Criteria

1. WHEN an authenticated user with profile `GESTIONNAIRE` invokes the business credit authorization action for a client, THE `ClientService` SHALL set `client.businessCreditAuthorized = true`, `client.businessCreditAuthorizedBy` to the authenticated user's username, and `client.businessCreditAuthorizedAt` to the current timestamp, and SHALL persist the update.
2. WHEN authorization succeeds, THE `ClientService` SHALL persist a `BusinessCreditAuthorizationEvent` with `action = AUTHORIZED`, `clientId`, `performedBy` set to the authenticated user's username, and `performedAt = now()`.
3. IF the authenticated user does not have profile `GESTIONNAIRE`, THEN THE `ClientService` SHALL reject the authorization request with an error indicating that GESTIONNAIRE privileges are required.
4. IF the provided `clientId` does not correspond to an existing client record, THEN THE `ClientService` SHALL throw an exception and the response SHALL indicate that the client was not found.
5. IF the client is already authorized (`businessCreditAuthorized = true`), THEN THE `ClientService` SHALL reject the request with an error indicating that the client is already authorized for business credit.
6. WHEN the authorization succeeds, THE `ClientController` SHALL return HTTP 200 with the updated client representation including `businessCreditAuthorized = true`, `businessCreditAuthorizedBy`, and `businessCreditAuthorizedAt`.
7. THE authorization action SHALL be available via `POST /api/v1/clients/{clientId}/business-credit-authorization`.
8. THE system SHALL record the authorization event in the application audit log (username, clientId, timestamp).

---

### Requirement 4: Habilitation business — révocation par le GESTIONNAIRE

**User Story:** En tant que GESTIONNAIRE, je veux pouvoir retirer l'habilitation business d'un client à tout moment, afin d'empêcher la création de futurs crédits professionnels tout en laissant le crédit business en cours se poursuivre normalement.

#### Acceptance Criteria

1. WHEN an authenticated user with profile `GESTIONNAIRE` invokes the business credit revocation action for a client, THE `ClientService` SHALL set `client.businessCreditAuthorized = false`, clear `businessCreditAuthorizedBy` and `businessCreditAuthorizedAt`, and persist the update.
2. WHEN revocation succeeds, THE `ClientService` SHALL persist a `BusinessCreditAuthorizationEvent` with `action = REVOKED`, `clientId`, `performedBy` set to the authenticated user's username, and `performedAt = now()`.
3. IF the client is not authorized (`businessCreditAuthorized = false`), THEN THE `ClientService` SHALL reject the request with an error indicating that the client is not authorized for business credit.
4. IF the authenticated user does not have profile `GESTIONNAIRE`, THEN THE `ClientService` SHALL reject the revocation request with an error indicating that GESTIONNAIRE privileges are required.
5. THE revocation action SHALL be available via `DELETE /api/v1/clients/{clientId}/business-credit-authorization`.
6. WHEN revocation succeeds, THE `ClientController` SHALL return HTTP 200 with the updated client representation including `businessCreditAuthorized = false`.
7. THE system SHALL record the revocation event in the application audit log (username, clientId, timestamp).
8. WHEN revocation is performed while a `BUSINESS` credit is in progress, THE `ClientService` SHALL NOT modify, cancel, or affect the in-progress `BUSINESS` credit; only future `BUSINESS` credit creations SHALL be blocked.
9. WHEN revocation is performed while a `BUSINESS` credit is in progress, THE `ClientService` SHALL NOT modify `client.businessCreditInProgress`.

---

### Requirement 4b: Historique des habilitations et révocations

**User Story:** En tant que GESTIONNAIRE, je veux consulter l'historique complet des habilitations et révocations business d'un client, afin d'avoir une traçabilité auditables des décisions prises.

#### Acceptance Criteria

1. THE `BusinessCreditAuthorizationEvent` Entity SHALL persist the following fields: `id` (Long, PK), `clientId` (Long, NOT NULL), `action` (enum `BusinessCreditAuthorizationAction`, NOT NULL), `performedBy` (String, NOT NULL), `performedAt` (LocalDateTime, NOT NULL), plus les champs d'audit standard (`createdDate`, `createdBy`, etc.).
2. THE Flyway migration SHALL create the `business_credit_authorization_event` table with all columns listed in criterion 1.
3. WHEN a `BusinessCreditAuthorizationEvent` is persisted, THE record SHALL be immutable; THE system SHALL NOT provide any update or delete operation on historical events.
4. THE `ClientService` SHALL expose a method to retrieve the authorization history for a client, ordered by `performedAt` descending (most recent first).
5. THE authorization history SHALL be available via `GET /api/v1/clients/{clientId}/business-credit-authorization/history`.
6. WHEN a user with role `ROLE_VALIDATE_CREDIT` views the client details, THE frontend SHALL display the authorization history timeline.
7. EACH history entry SHALL display the action (`AUTHORIZED` or `REVOKED`), the username (`performedBy`), and the timestamp (`performedAt`).

---

### Requirement 5: Validation backend à la création d'un crédit BUSINESS

**User Story:** En tant que système, je veux refuser la création d'un crédit BUSINESS si le client n'est pas habilité, afin de garantir qu'aucune vente professionnelle ne contourne l'habilitation préalable du GESTIONNAIRE.

#### Acceptance Criteria

1. WHEN a `Credit` creation request with `creditPurpose = BUSINESS` is received, THE `CreditService` SHALL verify that `client.businessCreditAuthorized = true`.
2. IF `creditPurpose = BUSINESS` and `client.businessCreditAuthorized = false`, THEN THE `CreditService` SHALL throw a `CustomValidationException` with message `"Ce client n'est pas habilité pour un crédit professionnel."` and SHALL prevent the creation.
3. WHEN a `Credit` creation request with `creditPurpose = BUSINESS` is received and the client is authorized, THE `CreditService` SHALL apply the unicity rules defined in Requirement 2 for the `BUSINESS` purpose before proceeding.
4. WHEN a `Credit` creation request with `creditPurpose = PERSONAL` is received, THE `CreditService` SHALL NOT require `businessCreditAuthorized` and SHALL apply the unicity rules for the `PERSONAL` purpose.
5. THE rule requiring `businessCreditAuthorized = true` SHALL apply to every `BUSINESS` credit creation, regardless of whether a `PERSONAL` credit is simultaneously in progress (Option A).

---

### Requirement 6: Mise à jour des flags Client

**User Story:** En tant que système, je veux maintenir les flags `creditInProgress`, `businessCreditInProgress` et `businessCreditAuthorized` sur l'entité `Client` synchronisés avec l'état réel, afin que les interfaces et requêtes puissent connaître rapidement l'état d'un client.

#### Acceptance Criteria

1. THE `Client` Entity SHALL expose a `businessCreditInProgress` boolean field with default value `false`.
2. THE `Client` Entity SHALL expose a `businessCreditAuthorized` boolean field with default value `false`.
3. THE `Client` Entity SHALL expose nullable fields `businessCreditAuthorizedBy` (String) and `businessCreditAuthorizedAt` (LocalDateTime) reflecting the **current** authorization (cleared on revocation; full history in `BusinessCreditAuthorizationEvent`).
4. THE Flyway migration SHALL add columns `business_credit_in_progress BOOLEAN DEFAULT FALSE NOT NULL`, `business_credit_authorized BOOLEAN DEFAULT FALSE NOT NULL`, `business_credit_authorized_by VARCHAR(255)`, and `business_credit_authorized_at TIMESTAMP` to the `client` table.
5. WHEN a `PERSONAL` credit is persisted to the database for a client, THE `ClientService` SHALL set `client.creditInProgress = true` for that client.
6. WHEN a `BUSINESS` credit is persisted to the database for a client, THE `ClientService` SHALL set `client.businessCreditInProgress = true` for that client.
7. WHEN a `PERSONAL` credit reaches status `SETTLED` or is soft-deleted (`state = DISABLED`) and no other `PERSONAL` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` remains for that client, THE `ClientService` SHALL set `client.creditInProgress = false`.
8. WHEN a `BUSINESS` credit reaches status `SETTLED` or is soft-deleted (`state = DISABLED`) and no other `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` remains for that client, THE `ClientService` SHALL set `client.businessCreditInProgress = false`.
9. WHILE at least one `BUSINESS` credit with `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED` exists for a client, THE `Client` Entity SHALL have `businessCreditInProgress = true`.
10. IF the `Credit` entity being created or modified has `creditPurpose = PERSONAL` or `creditPurpose = null`, THEN THE `ClientService` SHALL update `creditInProgress` and SHALL NOT modify `businessCreditInProgress`.
11. THE `businessCreditAuthorized` flag SHALL NOT be modified automatically by credit lifecycle events; it is only changed via explicit GESTIONNAIRE authorization or revocation actions.

---

### Requirement 7: Interface frontend Angular — habilitation client

**User Story:** En tant que GESTIONNAIRE, je veux habiliter ou retirer l'habilitation business d'un client depuis la liste et la fiche client, afin de gérer les habilitations sans quitter le contexte client.

#### Acceptance Criteria

1. WHEN a user with role `ROLE_VALIDATE_CREDIT` views the client list or client details, THE interface SHALL display an action button to authorize business credit if `businessCreditAuthorized = false`.
2. WHEN a user with role `ROLE_VALIDATE_CREDIT` views the client list or client details and `businessCreditAuthorized = true`, THE interface SHALL display a visual indicator (badge or label) confirming the business credit authorization, including `businessCreditAuthorizedBy` and `businessCreditAuthorizedAt` when available.
3. WHEN a user with role `ROLE_VALIDATE_CREDIT` views a client with `businessCreditAuthorized = true`, THE interface SHALL display an action to revoke the business credit authorization, regardless of whether `businessCreditInProgress = true`.
4. WHEN the revoke action is displayed and `businessCreditInProgress = true`, THE interface SHALL display an informational message indicating that the revocation does not affect the in-progress business credit and only prevents future business credit creations.
5. WHEN the authorize action is confirmed, THE frontend SHALL call `POST /api/v1/clients/{clientId}/business-credit-authorization` and refresh the client data on success.
6. WHEN the revoke action is confirmed, THE frontend SHALL call `DELETE /api/v1/clients/{clientId}/business-credit-authorization` and refresh the client data on success.
7. IF the API returns an error, THE frontend SHALL display the error message without modifying the local client state.
8. WHEN a user without role `ROLE_VALIDATE_CREDIT` views clients, THE authorization and revocation actions SHALL NOT be visible.
9. WHEN a user with role `ROLE_VALIDATE_CREDIT` views the client details, THE interface SHALL display the authorization history timeline fetched from `GET /api/v1/clients/{clientId}/business-credit-authorization/history`.

---

### Requirement 8: Interface frontend Angular — création de vente à crédit

**User Story:** En tant qu'agent commercial, je veux choisir la finalité du crédit (personnel ou professionnel) lors de la création d'une vente, uniquement si le client est habilité, afin de créer la vente adéquate sans friction inutile.

#### Acceptance Criteria

1. WHEN a user creates a credit of type `CREDIT` (à terme) and the selected client has `businessCreditAuthorized = true`, THE Credit Form SHALL display a `creditPurpose` selector with options `PERSONAL` (Personnel) and `BUSINESS` (Professionnel).
2. WHEN a user creates a credit of type `CREDIT` and the selected client has `businessCreditAuthorized = false`, THE Credit Form SHALL NOT display the `creditPurpose` selector and SHALL submit `creditPurpose = PERSONAL` implicitly.
3. WHEN the selected client changes during form editing, THE Credit Form SHALL re-evaluate whether the `creditPurpose` selector is visible and reset `creditPurpose` to `PERSONAL` if the new client is not authorized.
4. WHEN the credit creation form is submitted, THE Credit Form SHALL include `creditPurpose` in the `CreditDto` payload.
5. IF `creditPurpose` is not selected by the user, THE Credit Form SHALL default to `PERSONAL` in the submitted payload.
6. IF the backend returns an error indicating the client is not authorized for business credit or already has a business credit in progress, THE Credit Form SHALL display the error message to the user.

---

### Requirement 9: Endpoints REST et contrats d'API

**User Story:** En tant que développeur frontend, je veux des contrats d'API clairs et stables pour l'habilitation client et la création de crédits, afin d'intégrer facilement les nouveaux flux dans l'interface Angular.

#### Acceptance Criteria

1. THE `CreditController` SHALL expose `POST /api/v1/credits` accepting a `CreditDto` that includes an optional field `creditPurpose` (enum `CreditPurpose`).
2. THE `ClientController` SHALL expose `POST /api/v1/clients/{clientId}/business-credit-authorization` requiring GESTIONNAIRE privileges.
3. THE `ClientController` SHALL expose `DELETE /api/v1/clients/{clientId}/business-credit-authorization` requiring GESTIONNAIRE privileges.
4. THE `ClientController` SHALL expose `GET /api/v1/clients/{clientId}/business-credit-authorization/history` returning a list of `BusinessCreditAuthorizationEventDto` ordered by `performedAt` descending.
5. THE `ClientDto` and `ClientRespDto` SHALL expose fields `businessCreditAuthorized`, `businessCreditAuthorizedBy`, `businessCreditAuthorizedAt`, and `businessCreditInProgress`.
6. WHEN a credit creation fails because a credit of the same `creditPurpose` is already in progress for the client, THE `CreditController` SHALL return HTTP 400 with an error message that identifies the conflicting `creditPurpose`.
7. WHEN a credit creation fails because `businessCreditAuthorized = false` for a `BUSINESS` credit, THE `CreditController` SHALL return HTTP 400 with an error message indicating that the client is not authorized for business credit.
8. WHEN authorization or revocation fails because the user lacks GESTIONNAIRE privileges, THE `ClientController` SHALL return HTTP 403 with an appropriate error message.

---

### Requirement 10: Performance et index de base de données

**User Story:** En tant qu'administrateur système, je veux que les requêtes de vérification d'unicité par finalité soient optimisées, afin que la création de crédits ne dégrade pas les performances globales même avec un volume important de données.

#### Acceptance Criteria

1. THE Flyway migration SHALL create an index `idx_credit_client_purpose_status` on columns `(client_id, credit_purpose, status, state)` of the `credit` table.
2. IF the system needs to display whether a client has an active BUSINESS credit, THEN THE `ClientService` SHALL read the `businessCreditInProgress` flag from the `Client` entity instead of executing a count query against the `credit` table.
3. IF the system needs to display whether a client is authorized for business credit, THEN THE `ClientService` SHALL read the `businessCreditAuthorized` flag from the `Client` entity.
4. WHEN the `CreditRepository` checks for an active credit by purpose, THE `CreditRepository` SHALL use the query `countByClientIdAndPurposeAndStatusIn` scoped to `status IN (INPROGRESS, CREATED, VALIDATED)` and `state = ENABLED`, leveraging the composite index `idx_credit_client_purpose_status`.
5. WHEN a `BUSINESS` credit reaches `SETTLED` status or is soft-deleted, THE `ClientService` SHALL set `client.businessCreditInProgress = false` so that subsequent display operations do not require a count query.
