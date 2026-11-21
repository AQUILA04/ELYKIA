# Patterns système

Monorepo. Le backend PostgreSQL est la source de vérité. Le web admin et l’espace client parlent REST/JSON. Le mobile terrain est **local-first** (SQLite) et ne pousse le serveur qu’à la synchronisation.

Schémas d’intégration (partiellement périmés sur les versions Angular) : `docs/integration-architecture.md`, `docs/architecture-backend.md`, `docs/architecture-mobile.md`. S’y fier pour les flux, pas pour les numéros de version (voir `techContext.md`).

## Pièces

| Dossier | Rôle |
|---------|------|
| `backend/` | Monolithe modulaire Spring Boot 4 / Spring Modulith `optimize-elykia-core` (1 seul JAR ; 15 modules : `entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `finance`, `sale`, `tontine`, `carnet`, `recruitment`, `ai`, `apprelease`, `core`) |
| `frontend/` | Admin web Angular |
| `mobile/` | App terrain Ionic / Capacitor (commercial + chef de recouvrement) |
| `customer-space/` | Espace client Ionic / Capacitor (`com.optimize.elykia.customer`) |
| `website/` | Site vitrine `www.amenouveve-yaveh.com` |
| `landing-page/` | Page statique `elykia.optimizesolux.com` |
| `deploy/` | Compose, scripts VPS, monitoring |
| `user-guide/` | Guide MkDocs |
| `docs/` | Docs techniques et changelog |

## Backend

Architecture **Spring Modulith `2.2.0`** (point d'entrée `com.optimize.elykia.OptimizeElykiaCoreApplication` avec `@Modulithic(additionalPackages = "com.optimize.common")`, frontières vérifiées en CI par `ModularityTests`) :

- `entities` (`com.optimize.common.entities`, `OPEN`, feuille pure sans dépendance sortante) : `BaseEntity`, `GenericService`, exceptions, i18n (`CommonEntitiesI18nConfig`).
- `securities` (`com.optimize.common.securities`, `OPEN`, dépend uniquement de `entities`) : sécurité JWT, permissions `ROLE_*`, profils nommés, licences, paramètres applicatifs. Pas de session serveur pour l'UI.
- `shared` (`com.optimize.elykia.shared`, `OPEN`, dépend de `entities`, `securities`) : utilitaires et constantes métier transverses (`security/` dont `CollectorAudienceSecurity`, `util/`, `domain/OperationType` & `MonthlyReportOutboxStatus`, `carnet/` dont `CarnetVerifiable`, `CarnetVerificationSupport`, `CarnetEcartRules`, `CarnetEcartDetectedEvent`, `EcartDecisionView`, `RmFieldListProgress*`, `monitoring/BusinessMetricsPublisher`, `pdf/` dont `PdfHtmlRenderer`, `PdfDocumentIdentity`, `UnitPriceVisibility`, `cache/CacheNames`, `web/ElasticSearchWrapper` & `BulkCountResult`).
- `client` (`com.optimize.elykia.client`, `OPEN`, dépend de `entities`, `securities`, `shared`) : domaine `Client`, `Account`, autorisations crédit business, réaffectation / historique de collecteurs (`InProgressCreditsTransferEvent`), stockage MinIO / photos clients & articles (`storage/`).
- `notification` (`com.optimize.elykia.notification`, `CLOSED`, `@NamedInterface("api")`, isolé de `core`) : notifications internes (`AppNotification*`) et client OTP `NotificationHub*`. Les autres modules consomment exclusivement `notification :: api` (`AppNotificationFacade` + 4 commandes `record` Java 25, `AppNotificationType`, `NotificationHubOtpClient`).
- `organization` (`com.optimize.elykia.organization`, `OPEN` pendant le découpage, isolé de `core`) : `Agency`, `Locality`, `Promoter`, `CommercialAccountAssignment`, `CommercialStaff*`, `CommercialDataSummary*`, `UserManagement`.
- `inventory` (`com.optimize.elykia.inventory`, `OPEN` pendant le découpage, isolé de `core`) : catalogue (`Articles`, `ArticleType`, photos, packaging), réceptions magasin, mouvements (`StockMovement` découplé par `relatedCreditId`), valorisation FIFO (`ArticleStockLot*`, `StockValuationFacade`), inventaires & réconciliations, `ArticlePriceChangedEvent`, et 3 ports SPI (`SupplyExpensePort` implémenté par `finance`, `InventoryDebtPort` implémenté par `sale`, `InventoryControlPdfPort` implémenté par `core`).
- `finance` (`com.optimize.elykia.finance`, `OPEN` pendant le découpage, isolé de `core`) : dépenses (`Expense*`, implémente `inventory.api.SupplyExpensePort`), caisse & journée comptable (`AccountingDay`, `DailyAccountancy`, `DailyAccounting`, `CashDeposit`, `CashPeriodRemittance*`, `CashSurplusReallocation*`, `DailyOperationLog`), rapports journaliers/mensuels commerciaux & agence (`DailyCommercialReport`, `CommercialReportMonthly`, `AgencyDailyReport`, `AgencyWeekly*`, `CommercialCockpitService`, `DailyReportPdfService`), et 5 ports SPI (`CreditAccountingPort` & `FieldControlDebtPort` implémentés par `sale`, `TontineCatchupQueryPort` implémenté par `tontine` ; `CashDeskDailyOperationPdfPort`, `CommercialYearlyPortfolioPort` implémentés par `core`).
- `sale` (`com.optimize.elykia.sale`, `OPEN` pendant le découpage, isolé de `core`, consomme `notification :: api`) : ventes/crédits (`Credit`, `CreditArticles`, `CreditTimeline`, `CreditFieldControl`, `ClientReliquat`, `Recovery`, `RemainingAtClients*`), commandes (`Order*`), annulations (`SaleCancellation*`), stock commercial mensuel (`CommercialMonthlyStock*`, `StockRequest*`, `StockReturn*`, `CommercialStockMovement`), dettes commerciales (`DebtDocument*`, `DebtService`), 7 événements métier, 7 ports SPI (`WarehouseCashSalePricingPort` implémenté par `tontine`, `CreditCarnetRecontrolPort` implémenté par `carnet`, et 5 ports vers `core`), et implémente directement `finance.api.CreditAccountingPort`, `finance.api.FieldControlDebtPort` et `inventory.api.InventoryDebtPort`.
- `tontine` (`com.optimize.elykia.tontine`, `OPEN` pendant le découpage, isolé de `carnet` et `core`, `tontine → sale` unidirectionnel) : sessions, membres, cotisations, livraisons, conflits multi-tablettes, réinitialisations (`TontineCollectionResetReportDay`), `ClientAccountMovement`/`ClientAccountService`, stock tontine (`StockTontine*`), `CashSalePricingService` (`WarehouseCashSalePricingPort`), `TontineCatchupQueryPortAdapter` (`TontineCatchupQueryPort`), `TontineCreditCreationService`, et 3 ports SPI (`TontineCarnetRecontrolPort` implémenté par `carnet`, `FormerPortfolioTontinePort` & `TontineHtmlPdfPort` implémentés par `core`).
- `carnet` (`com.optimize.elykia.carnet`, `OPEN` aval, isolé de `core`) : écarts carnet (`CarnetEcart*`, `CarnetEcartRecontrolPolicy` implémentant directement `CreditCarnetRecontrolPort` et `TontineCarnetRecontrolPort`), plans de tournée (`RecoveryFieldDayPlan`, `RecoveryFieldPlanService`, `CarnetTontineQueryRepository`), packs et rapports chef de recouvrement (`RecoveryManager*`).
- `recruitment` (`com.optimize.elykia.recruitment`, `CLOSED`, isolé de `core`) : domaine recrutement (référence DDD pragmatique).
- `ai` (`com.optimize.elykia.ai`, `CLOSED`, isolé de `core`) : Elykia IA (`domain/`, `application/`, `infrastructure/{persistence,llm,config}/`, `web/dto/`). Schéma SQL = snapshot `backend/src/main/resources/ai/schema-catalog.json` ; aide = index RAG `user-guide-index.json` ; fournisseur LLM par `elykia.ai.provider`.
- `apprelease` (`com.optimize.elykia.apprelease`, `CLOSED`, isolé de `core`) : distribution des APK mobile & espace client (`application/`, `web/dto/`).
- `core` (`com.optimize.elykia.core`, `CLOSED`, feuille pure — 0 référence entrante depuis les 14 autres modules) : derniers domaines à extraire en Vague 7 (`customer` + `adhesion` + `paygate` + `ocr`, `bi`, `reporting`/`FormerPortfolio`, `bootstrap`).

- Flyway : `backend/src/main/resources/db/migration/V0xx__*.sql`, `out-of-order: false`, `baseline-on-migrate`, baseline 0. Dernière migration au 2026-11-21 : `V045__tontine_delivery_planned_date.sql`. Les tests backend tournent en `create-drop` : une migration n'y est pas exécutée, la valider à part sur un Postgres 15.
- Fichiers : MinIO (photos clients, articles, rapports, APK, recrutement). Clés uniquement par variables d’environnement.
- OTP espace client : client HTTP local `notificationhub/` (contournement historique). Nouvelle intégration : starter `sb-notification-hub-starter`, pas d’extension de ce client. Voir la règle `notification-hub-starter-first`.
- Préfixes HTTP **mélangés** : `/api/...` et `/api/v1/...` selon les contrôleurs. Traefik expose le backend sous le préfixe public `/api` et en retire un segment.

### Paramètres applicatifs (table `parameter`)

- Déclaration : `app.security.parameter.init-data[n]` (`key`, `value`, `description`) dans `backend/src/main/resources/application.yml`, et dans `backend/src/test/resources/application.yml` pour les tests. Pas de migration Flyway.
- Amorçage : `ParameterInitializer` (module `securities`) insère au démarrage **seulement les clés absentes**. Changer `value` dans le yml ne modifie pas une base déjà en service : la valeur se règle dans **Configuration > Paramètres généraux** (`frontend/src/app/parameters`).
- Lecture : backend `ParameterService.isEnabled(clé)` (booléen, `false` si la clé manque), `getValue(clé)`, `lockAndIsEnabled` pour une activation sous verrou. Web et mobile : `GET /api/parameters/enabled/{clé}` (mobile : cache, relu à l'accueil et au plus toutes les 6 h ; ex. `UnitPriceVisibilityService`).
- Exemples : `RESTRICT_*_UNIT_PRICE_VISIBILITY` (`UnitPriceVisibility`), `DUAL_CREDIT_AUTHORIZATION`, `ENABLED_FIFO_STOCK_VALUATION`, `TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL`, `TONTINE_ORDER_AUTO_VALIDATION` (`TontineDeliveryService.AUTO_VALIDATION_PARAMETER`).
- Un nouveau paramètre : constante de clé côté code, entrée `init-data` (index suivant) dans les deux yml, test du comportement activé et désactivé, page **Paramètres généraux** du guide gestionnaire.

## Frontend admin

Modules métier sous `frontend/src/app/` (crédit, stock, tontine, caisse, commandes, BI, IA, commerciaux, dettes, dépenses, inventaire, etc.). Routes récentes en `loadChildren` ; des écrans restent eager (localités, gestion, dépôts). Toute modification d’un domaine encore eager doit le passer en lazy-loading dans la même tâche (règle `frontend-lazy-loading-migration`).

État : services Angular + RxJS, pas de store global. Gardes : `AuthGuard`, `NgxPermissionsGuard`, `FeatureFlagGuard`, `AiChatGuard`. Confirmations : `AlertService` uniquement (pas de `confirm()` / SweetAlert direct).

## Mobile

Deux coques : `tabs/` (commercial) et `rm-tabs/` (chef de recouvrement, `RmProfilGuard`). Features : sync, stock, clients, commandes, tontine, recovery, écarts / contrôles carnet, ancien portefeuille, consentement de synchro et consentement journalier.

Règles : écritures métier sur SQLite ; l’API sert au chargement initial et à la synchro explicite ; toute lecture est filtrée par l’utilisateur (`commercialUsername` ou colonne équivalente). NgRx (store, effects, entity). Capacitor : caméra, géoloc, SQLite, imprimante ceinture, Crashlytics, Remote Config.

## Espace client

`customer-space/src/app/features/` : auth, dashboard, purchases, catalog, cart, payment, tontines, notifications, account-deletion, privacy. Variantes `desktop/` à côté des écrans téléphone. Firebase sert au Remote Config. Les SMS OTP passent par le backend (Notification Hub), plus par Firebase Phone Auth.

## Données — repères

Le catalogue narratif (incomplet face au schéma réel) est `docs/data-models-backend.md`. Pour l’IA et les requêtes, la whitelist est `schema-catalog.json`. Entités citées par cette doc : `Tontine`, `TontineSession`, `TontineMember`, `TontineCollection`, commandes, crédits, articles, mouvements de stock, `Agency`, `Promoter`, `Locality`, dépenses, versements, journée comptable. Affectation des comptes commerciaux : personnes et périodes non chevauchantes (`V040`).

## Conventions agent

- Changelog versionné par composant : skill `keep-changelog`. Mobile : trois fichiers de version alignés.
- UI ou règle métier : mettre à jour `user-guide/docs/`, régénérer l’index RAG et `frontend/src/user-guide/`.
- DDL queryable : mettre à jour `schema-catalog.json` (et `sql-examples.json` si un exemple casse).
- Correctif VPS (Contabo) : le même diff dans Git avant de considérer le travail livré. Le CD écrase `/opt/elykia`.
- Fuseau : GMT (UTC+0, Lomé). Citer les timestamps en GMT, sans conversion vers l’heure Maurice.
- Documents / PDF : design system clair navy (`#0a2472`) dans le skill `elykia-document-design` (référence `assets/recu-commande.html`). Pipeline backend iText + pagination `n/N` : skill `elykia-pdf-style` (s’appuie sur le design system ; pas de flex/grid côté iText).
- Reçu ou facture (ticket ou PDF) : code d’authenticité `ELY-XXXX-XXXX`, persisté, vérifiable. Règle `receipt-authenticity`. Référence : reçu de commande tontine.
- UI admin liste : skill `frontend-ui-style`. UI mobile stock : skill `elykia-stock-components-build`.
- Plans `.cursor/plans/` inclus dans les commits.
