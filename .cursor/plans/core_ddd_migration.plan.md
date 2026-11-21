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
| **Vague 3** | `inventory` (`OPEN` — Catalogue, Magasin, Réceptions, Mouvements, FIFO, Packaging, Inventaires + 3 ports SPI `inventory.api`) & enrichissement `shared` | **Fait (`2.4.0`)** |
| **Vague 4** | `finance` (`OPEN` — Dépenses, Caisse, Journée comptable, Versements/Remises/Surplus, Rapports journaliers & mensuels + 5 ports SPI `finance.api` + absorption de `SupplyExpensePortAdapter`) | **Fait (`2.5.0`)** |
| **Vague 5** | `sale` (`OPEN` — Ventes/Crédits, Commandes, Annulations, Stock commercial `CommercialMonthlyStock`/`StockRequest`/`StockReturn`, Dettes `DebtDocument`/`DebtService`, `RemainingAtClients*`, 7 ports SPI `sale.api`, absorption de 3 adaptateurs SPI + enrichissement `shared.carnet`) | **Fait (`2.6.0`)** |
| **Vague 6** | `tontine` (`tontine → sale` unidirectionnel + `StockTontine*` + `TontineCreditCreationService`) + `carnet` (module aval + `RecoveryFieldPlan*`/`RecoveryManager*`) | Planifiée |
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
- **Éléments délibérément reportés aux vagues ultérieures :** `AgencyDailyReport*`/`AgencyWeeklyReport*`/`AgencyWeeklyDeposit*` (Vague 4 `finance`), `CommercialMonthlyStockService` (Vague 3/5), `CommercialPerformanceService` (Vague 7 `bi`), `FormerPortfolioService` (Vague 7), `ClientListPdfService`/`ClientExportController` (Vague 4/5), `CustomerNotification*` (Vague 7 `customer`).
- **`ModularityTests` :** vérifie les **10 modules** (`entities`, `securities`, `client`, `shared`, `notification`, `organization`, `recruitment`, `ai`, `apprelease`, `core`) et la frontière stricte `core → notification :: api`.

## 5. Périmètre exact de la Vague 3 (`2.4.0`)

- **`shared` (enrichi) :** `BusinessMetricsPublisher` (`shared.monitoring`), `OperationType` (`shared.domain`), `PdfDocumentIdentity` & `UnitPriceVisibility` (`shared.pdf` + test).
- **`inventory` (`OPEN` pendant le découpage, `allowedDependencies = {"entities", "securities", "client", "shared", "organization"}`, 0 dép. sur `core`) :**
  - `api/` : 3 ports SPI (`SupplyExpensePort`, `InventoryDebtPort`, `InventoryControlPdfPort`) implémentés dans `core` (`SupplyExpensePortAdapter`, `InventoryDebtPortAdapter`, `InventoryControlPdfPortAdapter`).
  - `domain/` : 16 entités JPA (`Articles`, `ArticleType`, `ArticleHistory`, `ArticlePriceHistory`, `ArticleStateHistory`, `ArticleSalePack`, `ArticleStockLot*`, `StockReception*`, `ReceptionSalePack`, `StockMovement` avec `relatedCreditId` scalaire sur `related_credit_id`, `Inventory*`), 15 enums, 6 classes règles/VO (`ArticleCodeGenerator`, `ArticlePackagingRules`, `ArticlePhotoKeys`, `ArticlePhotoView`, `ArticleCatalogSortOrder`, `StockPriceRealignmentParams`).
  - `event/` : `ArticlePriceChangedEvent` (écouté par `core` via `StockPriceRealignmentService`).
  - `infrastructure/persistence/` : 14 repositories JPA.
  - `application/` : 16 services & listeners (`ArticlesService`, `ArticleTypeService`, `ArticleHistoryService`, `ArticlePhotoService`, `ArticleStockTrajectoryService`, `InventoryService`, `InventoryReconciliationService`, `InventoryWarehouseGuard`, `StockReceptionService`, `StockMovementService`, `ArticlePackagingPricingService`, `FifoStockActivationService`, `FifoStockActivationListener`, `FifoStockValuationService`, `LegacyStockValuationAdapter`, `StockValuationFacade`) + 14 suites de tests.
  - `web/` : 6 contrôleurs (`ArticlesController` découplé via `core.controller.article.ArticleSaleQueryController`, `ArticleTypeController`, `StockReceptionController`, `StockFifoController`, `InventoryController`, `InventoryReconciliationController`), 3 mappers MapStruct, 33 DTOs.
- **Éléments stock terrain délibérément reportés :** `CommercialMonthlyStock*`/`StockRequest*`/`StockReturn*` (couplés `DebtDocument`/`Credit`/`Order` → Vague 5 `sale`), `StockTontine*`/`TontineStock*` (couplés `TontineDelivery` → Vague 6 `tontine`), `StockPriceRealignmentService` (écoute `ArticlePriceChangedEvent` côté `core`).
- **`ModularityTests` :** vérifie désormais les **11 modules** (`entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `recruitment`, `ai`, `apprelease`, `core`).

## 6. Périmètre exact de la Vague 4 (`2.5.0`)

- **`finance` (`OPEN` pendant le découpage, `allowedDependencies = {"entities", "securities", "client", "shared", "organization", "inventory"}`, 0 dép. sur `core`, 126 fichiers déplacés via `git mv`) :**
  - `api/` : 5 ports SPI (`CreditAccountingPort`, `TontineCatchupQueryPort`, `FieldControlDebtPort`, `CashDeskDailyOperationPdfPort`, `CommercialYearlyPortfolioPort`) implémentés par de fins adaptateurs dans `core`.
  - `domain/` : 16 entités JPA (`Expense`, `ExpenseType`, `AgencyDailyReport`, `AgencyWeeklyDeposit`, `AgencyWeeklyReport`, `AccountingDay`, `DailyAccountancy`, `DailyAccounting`, `CashDeposit`, `CashPeriodRemittance`, `CashPeriodRemittanceExpense`, `CashSurplusReallocation`, `CashSurplusReallocationLine`, `CommercialReportMonthly`, `DailyCommercialReport`, `DailyOperationLog`), 7 enums (`AccountancyStatus`, `AccountingDayStatus`, `DepositStatus`, `PeriodState`, `RemittanceInitiator`, `RemittanceStatus`, `WeekStatus`), 4 règles/calculateurs (`CashDepositCategoryCalculator`, `CommercialReconciliationCalculator`, `OperationTypeLabels`, `ReportPeriod` + 2 suites de tests).
  - `infrastructure/persistence/` : 15 repositories JPA.
  - `application/` : 21 services & adaptateurs — dont **`SupplyExpensePortAdapter`** transféré de `core` vers `finance` pour implémenter directement `inventory.api.SupplyExpensePort` — + 14 suites de tests (`74,5 % LINE / 50,7 % BRANCH`).
  - `web/` : 11 contrôleurs (`DailyReportController` découplé des 3 endpoints portefeuille/tontine déplacés vers `core.controller.report.DailyReportPortfolioController`), 5 mappers MapStruct, 31 DTOs.
- **Éléments délibérément maintenus dans `core` pour les Vagues 5–7 :** `DebtDocument`/`DebtLine`/`DebtService` (`@ManyToOne CommercialMonthlyStock` / `CommercialMonthlyStockItem` → Vague 5 `sale`), et rapports transverses crédits/tontines (`ReportService`, `PdfService`, `MonthlyReportAggregationService`, `RemainingAtClients*`, `CommercialTontineYearlySummaryService`, `CommercialYearlyPortfolioService`, `RecoveryManagerReportPdfService`, `DailyTontineReportReconciler`).
- **`ModularityTests` :** vérifie désormais les **12 modules** (`entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `finance`, `recruitment`, `ai`, `apprelease`, `core`).

## 7. Périmètre exact de la Vague 5 (`2.6.0`)

- **`shared` (enrichi) :** `shared.carnet` (`CarnetVerifiable`, `CarnetVerificationSupport`, `BulkCarnetVerificationResultDto`, `CarnetEcartRules` + test, `CarnetEcartStatus`, `CarnetEcartDomain`, `CarnetEcartDirection`, `CarnetEcartDetectedEvent`, `EcartDecisionView`, `RmFieldListProgress`, `RmFieldListProgressSql`), `shared.domain.MonthlyReportOutboxStatus`, `shared.web.BulkCountResult`.
- **`sale` (`OPEN` pendant le découpage, `allowedDependencies = {"entities", "securities", "client", "shared", "notification :: api", "organization", "inventory", "finance"}`, 0 dép. sur `core`, 313 fichiers déplacés via `git mv`) :**
  - `api/` : 7 ports SPI (`AdhesionCreditPort`, `SaleBiAggregationPort`, `OrderCustomerNotificationPort`, `SalePdfExportPort`, `FormerPortfolioCreditPort`, `CreditCarnetRecontrolPort`, `WarehouseCashSalePricingPort`).
  - `domain/` : 31 entités JPA (Ventes/Crédits, Commandes, Annulations, Stock commercial mensuel, Dettes commerciales), 23 enums, 7 règles/calculateurs (`ClientReliquatNetRemaining`, `CommercialMonthlyStockCashSalePricing`, `CreditArticleUnitPricePolicy`, `CreditSearchSqlFilter`, `RattrapageCreditSupport`, `SaleStockSortOrder`, `SaleStockDeliveryPricing`).
  - `event/` : 7 événements (`CreditStartedEvent`, `CreditCollectionEvent`, `CreditCollectionCancelledEvent`, `OrderCreatedEvent`, `StockRequestValidatedEvent`, `StockRequestDeliveredEvent`, `StockReturnedEvent`).
  - `infrastructure/persistence/` : 29 repositories JPA (requêtes lecture seule BI/Ancien portefeuille isolées dans `core.repository.BiCreditQueryRepository`, `FormerPortfolioCreditQueryRepository`, `FormerPortfolioTimelineQueryRepository`).
  - `application/` : 42 services/listeners/adaptateurs — absorbant directement `CreditAccountingPortAdapter`, `FieldControlDebtPortAdapter` et `InventoryDebtPortAdapter` — + 43 suites de tests unitaires dans `sale` (`sale.domain` 71,3 % LINE, `sale.application` 56,2 % LINE).
  - `web/` : 13 contrôleurs, 4 mappers MapStruct, 103 DTOs (`SaleLineQuote` découplé de `TontineDeliveryItem`).
- **Orchestration `tontine → sale` :** `core.service.tontine.TontineCreditCreationService` porte `buildFromDelivery(TontineDelivery)` + validation/déduction stock tontine. Services transverses ventes+tontine (`RecoveryFieldPlanService`, `RecoveryManager*`, `CashSalePricingService`, `StockExportService`, `StockPriceRealignmentService`) conservés dans `core` jusqu'à la Vague 6.
- **`ModularityTests` :** vérifie désormais les **13 modules** (`entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `finance`, `sale`, `recruitment`, `ai`, `apprelease`, `core`).
