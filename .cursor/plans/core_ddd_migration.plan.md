# Plan directeur — Migration de `core` en Domaines (DDD + Spring Modulith `2.2.0`)

## 1. Décisions validées (2026-11-21)

- **Lot 1 exécuté :** **Vague 0 (`shared`) + Vague 1 (`ai` + `apprelease`)** sur `migration/architecture-refonte` (`optimize-elykia-core` **`2.2.0`**).
- **Style DDD interne :** **DDD pragmatique** aligné sur `recruitment` (`api/`, `domain/`, `application/`, `infrastructure/`, `web/`, entités JPA directement dans `domain/`, Value Objects `record` Java 25, façades/ports explicites dans `api/`).
- **Événements inter-modules :** événements Spring standard (`ApplicationEventPublisher` + `@EventListener` / `@TransactionalEventListener`, **0 migration Flyway**).
- **Quality gates JaCoCo `0.8.16` :** aucun abaissement de seuil ; `check-jacoco-service-quality-gate` étendue à `com/optimize/elykia/*/application/**`.

## 2. Feuille de route en 8 vagues (du moins couplé au plus central)

| Vague | Modules | Statut |
|---|---|---|
| **Vague 0** | `shared` (`OPEN` — `security/`, `util/`, `pdf/`) + `@ConfigurationPropertiesScan("com.optimize.elykia")` | **Fait (`2.2.0`)** |
| **Vague 1** | `ai` (`CLOSED` — 52 classes, 0 dép. sur `core`) + `apprelease` (`CLOSED` — 7 classes, 0 dép. sur `core`) | **Fait (`2.2.0`)** |
| **Vague 2** | `notification` (`CLOSED` + `notification::api`), `organization` (`OPEN` — `Agency`, `Locality`, `Promoter`, `CommercialStaff*`, `CommercialAccountAssignment`, `UserManagement`), rapatriement `client` + enrichissement `shared` | **Fait (`2.3.0`)** |
| **Vague 3** | `inventory` (`catalog` + `stock` + `inventory`, résout le cycle de 60 arêtes) | Planifiée |
| **Vague 4** | `finance` (`expense` + `accounting` + `report` + `debt`, résout le cycle de 46 arêtes) | Planifiée |
| **Vague 5** | `sale` (`Credit`, `Order`, `SaleCancellation`, `RecoveryFieldPlan`, façade `sale::api`) | Planifiée |
| **Vague 6** | `tontine` (`tontine → sale::api` unidirectionnel) + `carnet` (module aval + `CarnetEcartDetectedEvent`) | Planifiée |
| **Vague 7** | `customer` (`Espace Client` + `adhesion` + `paygate` + `ocr`) + `bi` + `FormerPortfolio` + suppression de `core/` | Planifiée |

## 3. Périmètre exact du Lot 1 (`2.2.0`)

- **`shared` (`com.optimize.elykia.shared`, `OPEN`, `allowedDependencies = {"entities", "securities"}`) :**
  - `security/` : `UserProfilConstant`, `UserPermissionConstant`, `ActingUserSecuritySupport`
  - `util/` : `PhoneNormalizer` (+ `PhoneNormalizerTest`), `DateUtils`, `MonthEndCalculator`, `MoneyUtil`, `PageableCacheKeyHelper`
  - `pdf/` : `PdfHtmlRenderer`, `PdfHeader`
- **`ai` (`com.optimize.elykia.ai`, `CLOSED`, `allowedDependencies = {"entities", "securities", "shared"}`) :**
  - `domain/` : `AiConversation`, `AiMessage`, `AiQueryLog`, `AiIntent`, `AiMessageRole`, `AiUserContext`, `SqlQueryResult`, exceptions domaine
  - `application/` : 18 services applicatifs (orchestration, SQL, RAG, audit, conversations, métriques, rate limiter, schema catalog) + 5 suites de tests
  - `infrastructure/` : `persistence/` (3 repositories), `llm/` (`ResilientChatModel` + test, `StubChatModel`), `config/` (`AiConfiguration`, `AiEmbeddingConfiguration`, `AiProperties`, `AiProviderEnvironmentPostProcessor` mis à jour dans `META-INF/spring.factories`)
  - `web/` : 5 contrôleurs + `web/dto/` (10 DTOs)
- **`apprelease` (`com.optimize.elykia.apprelease`, `CLOSED`, `allowedDependencies = {"entities", "securities", "client", "shared"}`) :**
  - `application/` : `MobileAppReleaseService`, `CustomerAppReleaseService` (+ 2 suites de tests)
  - `web/` : `MobileAppReleaseController`, `CustomerAppReleaseController` + `web/dto/` (`AppReleaseDownloadDto`, `MobileAppReleaseInfoDto`, `MobileAppReleaseManifestDto`)
- **`ModularityTests` :** vérifie les **8 modules** (`entities`, `securities`, `client`, `shared`, `recruitment`, `ai`, `apprelease`, `core`).

## 4. Périmètre exact de la Vague 2 (`2.3.0`)

- **`shared` (enrichi) :** `CollectorAudienceSecurity` (`shared.security`), `CacheNames` (`shared.cache`), `ElasticSearchWrapper` (`shared.web`).
- **`client` (`allowedDependencies = {"entities", "securities", "shared"}`) :** `BusinessCreditAuthorization*`, `ClientCollectorAssignment*`, `ClientCollectorHistory*`, `ClientPhotoUrl*`, `InProgressCreditsTransferEvent` (`client.event`), `ArticlePhotoBytes`/`ArticlePhotoCompressor`/`ArticlePhotoUrlService` (`client.storage`).
- **`notification` (`CLOSED`, `@NamedInterface("api")`, 0 dép. sur `core`) :**
  - `api/` : `AppNotificationFacade`, 4 commandes `record` Java 25 (`PaymentDeclarationNotificationCommand`, `CustomerOrderNotificationCommand`, `TontinePaymentDeclarationNotificationCommand`, `TontineCatchupNotificationCommand`), `AppNotificationType`, `NotificationHubOtpClient`, `NotificationHubOtpModels`, `NotificationHubClientException`, `NotificationHubProperties`
  - `domain/` : `AppNotification`, `AppNotificationRead`
  - `application/` : `AppNotificationService` (+ test)
  - `infrastructure/` : `persistence/` (2 repositories), `hub/` (`NotificationHubConfig`, `NotificationHubTokenProvider`)
  - `web/` : `AppNotificationController`, `web/dto/` (`AppNotificationDto`, `AppNotificationGroupDto`)
- **`organization` (`OPEN` pendant le découpage, `allowedDependencies = {"entities", "securities", "client", "shared"}`, 0 dép. sur `core`) :**
  - `domain/` : `Agency`, `Locality`, `Promoter`, `CommercialAccountAssignment`, `AssignmentPeriod`, `CommercialStaffPhotoKeys`, `LocalityNames`
  - `infrastructure/persistence/` : 4 repositories
  - `application/` : `AgencyService`, `LocalityService`, `PromoterService`, `CommercialStaffService`, `CommercialAccountAssignmentService`, `CommercialDataSummaryService`, `CommercialStaffPhotoService`, `UserManagement` (+ 7 suites de tests)
  - `web/` : 5 contrôleurs, `web/mapper/` (3 mappers MapStruct), `web/dto/` (11 DTOs)
- **Éléments délibérément reportés aux vagues ultérieures :** `AgencyDailyReport*`/`AgencyWeeklyReport*`/`AgencyWeeklyDeposit*` (Vague 4 `finance`), `CommercialMonthlyStockService` (Vague 3 `inventory`), `CommercialPerformanceService` (Vague 7 `bi`), `FormerPortfolioService` (Vague 7), `ClientListPdfService`/`ClientExportController` (Vague 4/5), `CustomerNotification*` (Vague 7 `customer`).
- **`ModularityTests` :** vérifie désormais les **10 modules** (`entities`, `securities`, `client`, `shared`, `notification`, `organization`, `recruitment`, `ai`, `apprelease`, `core`) et la frontière stricte `core → notification :: api`.
