# Patterns système

Monorepo. Le backend PostgreSQL est la source de vérité. Le web admin et l’espace client parlent REST/JSON. Le mobile terrain est **local-first** (SQLite) et ne pousse le serveur qu’à la synchronisation.

Schémas d’intégration (partiellement périmés sur les versions Angular) : `docs/integration-architecture.md`, `docs/architecture-backend.md`, `docs/architecture-mobile.md`. S’y fier pour les flux, pas pour les numéros de version (voir `techContext.md`).

## Pièces

| Dossier | Rôle |
|---------|------|
| `backend/` | Monolithe modulaire Spring Boot 4 / Spring Modulith `optimize-elykia-core` (1 seul JAR ; 19 modules : `entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `finance`, `sale`, `tontine`, `carnet`, `customer`, `bi`, `reporting`, `bootstrap`, `recruitment`, `ai`, `apprelease`, `company`) |
| `frontend/` | Admin web Angular |
| `mobile/` | App terrain Ionic / Capacitor (commercial + chef de recouvrement) |
| `customer-space/` | Espace client Ionic / Capacitor (`com.optimize.elykia.customer`) |
| `website/` | Site vitrine `www.amenouveve-yaveh.com` |
| `landing-page/` | Page statique `elykia.optimizesolux.com` |
| `deploy/` | Compose, scripts VPS, monitoring |
| `user-guide/` | Guide MkDocs |
| `docs/` | Docs techniques et changelog |

## Backend

Architecture **Spring Modulith `2.2.0`** (point d'entrée `com.optimize.elykia.OptimizeElykiaCoreApplication` avec `@Modulithic(additionalPackages = "com.optimize.common")`, **19 modules** vérifiés en CI par `ModularityTests`, dossier historique `core/` intégralement retiré) :

- `entities` (`com.optimize.common.entities`, `OPEN`, feuille pure sans dépendance sortante) : `BaseEntity`, `GenericService`, exceptions, i18n (`CommonEntitiesI18nConfig`).
- `securities` (`com.optimize.common.securities`, `OPEN`, dépend uniquement de `entities`) : sécurité JWT, permissions `ROLE_*`, profils nommés, licences, paramètres applicatifs. Pas de session serveur pour l'UI.
- `shared` (`com.optimize.elykia.shared`, `OPEN`, dépend de `entities`, `securities`) : utilitaires et constantes métier transverses (`security/` dont `CollectorAudienceSecurity`, `util/`, `domain/OperationType` & `MonthlyReportOutboxStatus`, `carnet/`, `monitoring/BusinessMetricsPublisher`, `pdf/`, `cache/CacheNames`, `web/`).
- `client` (`com.optimize.elykia.client`, `OPEN`, dépend de `entities`, `securities`, `shared`) : domaine `Client`, `Account`, autorisations crédit business, réaffectation / historique de collecteurs (`InProgressCreditsTransferEvent`), stockage MinIO / photos clients & articles (`storage/`).
- `notification` (`com.optimize.elykia.notification`, `CLOSED`, `@NamedInterface("api")`) : notifications internes (`AppNotification*`) et client OTP `NotificationHub*`. Les autres modules consomment exclusivement `notification :: api`.
- `organization` (`com.optimize.elykia.organization`, `OPEN`) : `Agency`, `Locality`, `Promoter`, `CommercialAccountAssignment`, `CommercialStaff*`, `CommercialDataSummary*`, `UserManagement`.
- `inventory` (`com.optimize.elykia.inventory`, `OPEN`) : catalogue, réceptions magasin, mouvements (`StockMovement`), valorisation FIFO, inventaires & réconciliations, `ArticlePriceChangedEvent`, et 3 ports SPI (`SupplyExpensePort` → `finance`, `InventoryDebtPort` → `sale`, `InventoryControlPdfPort` → `reporting`).
- `finance` (`com.optimize.elykia.finance`, `OPEN`) : dépenses (`SupplyExpensePort`), caisse & journée comptable, versements/remises/surplus, rapports journaliers/mensuels commerciaux & agence, et 5 ports SPI (`CreditAccountingPort` & `FieldControlDebtPort` → `sale`, `TontineCatchupQueryPort` → `tontine`, `CashDeskDailyOperationPdfPort` & `CommercialYearlyPortfolioPort` → `reporting`).
- `sale` (`com.optimize.elykia.sale`, `OPEN`, consomme `notification :: api`) : ventes/crédits (`SaleType` + `sealed interface SaleLifecyclePolicy` : `CreditSalePolicy`, `CashSalePolicy`, `TontineSalePolicy`), commandes, annulations, stock commercial mensuel, dettes commerciales, 7 événements métier, 7 ports SPI (`AdhesionCreditPort` & `OrderCustomerNotificationPort` → `customer`, `SaleBiAggregationPort` → `bi`, `SalePdfExportPort` & `FormerPortfolioCreditPort` → `reporting`, `CreditCarnetRecontrolPort` → `carnet`, `WarehouseCashSalePricingPort` → `tontine`).
- `tontine` (`com.optimize.elykia.tontine`, `OPEN`, `tontine → sale` unidirectionnel) : sessions, membres, cotisations, livraisons, conflits multi-tablettes, réinitialisations, `ClientAccountMovement`, stock tontine, `CashSalePricingService`, `TontineCatchupQueryPortAdapter`, `TontineCreditCreationService`, et 3 ports SPI (`TontineCarnetRecontrolPort` → `carnet`, `FormerPortfolioTontinePort` & `TontineHtmlPdfPort` → `reporting`).
- `carnet` (`com.optimize.elykia.carnet`, `OPEN` aval) : écarts carnet (`CarnetEcartRecontrolPolicy` implémentant `CreditCarnetRecontrolPort` + `TontineCarnetRecontrolPort`), plans de tournée (`RecoveryFieldPlanService`, `CarnetTontineQueryRepository`), packs et rapports chef de recouvrement (`RecoveryManager*`).
- `customer` (`com.optimize.elykia.customer`, `CLOSED`, `@NamedInterface("api")` pour `AdhesionCashEvent`) : Espace Client (portail, auth/OTP, onboarding, Mobile Money, notifications client → `OrderCustomerNotificationPort`), adhésion (`AdhesionService` → `AdhesionCreditPort`), PayGate (`infrastructure/paygate/`), OCR preuves de paiement (`infrastructure/ocr/`).
- `bi` (`com.optimize.elykia.bi`, `CLOSED`) : analytique BI (ventes, recouvrement, stock, performance commerciale, snapshots) et `BiAggregationService` (→ `SaleBiAggregationPort`).
- `reporting` (`com.optimize.elykia.reporting`, `CLOSED`, consomme `customer :: api`) : `PdfService` (→ `TontineHtmlPdfPort`), adaptateurs PDF (`SalePdfExportPort`, `InventoryControlPdfPort`, `CashDeskDailyOperationPdfPort`), rapports mensuels & outbox, `CommercialYearlyPortfolioService` (→ `CommercialYearlyPortfolioPort`), `ClientExportController`, `DailyReportEventListener`, Ancien Portefeuille (`FormerPortfolioService` + adaptateurs crédit/tontine).
- `bootstrap` (`com.optimize.elykia.bootstrap`, `CLOSED`) : configs Spring transverses, `DataInit`, `*PermissionsInit`, `CronManager`, synchronisation mobile (`MobileController`, `MobileTransaction*`), `AdminPhotoMigrationController`.
- `recruitment` (`com.optimize.elykia.recruitment`, `CLOSED`) : domaine recrutement.
- `ai` (`com.optimize.elykia.ai`, `CLOSED`) : Elykia IA (`schema-catalog.json`, RAG `user-guide-index.json`, LLM via `elykia.ai.provider`).
- `apprelease` (`com.optimize.elykia.apprelease`, `CLOSED`) : distribution des APK mobile & espace client.
- `company` (`com.optimize.elykia.company`, `CLOSED`) : profil entreprise et charte graphique globale (singleton `company_profile` indépendant d'`Agency`, logo `BYTEA` ≤ 2 Mo validé + anti-XSS SVG, cache Caffeine `COMPANY_PROFILE`/`COMPANY_LOGO`, endpoints publics `/api/public/company/**` avec `ETag`/`304`, admin `/api/v1/admin/company/**` sous `ROLE_ADMIN`, et pont `CompanyPdfBrandProfileProvider` → `shared.pdf.PdfBrandProfileProvider` injectant dynamiquement nom/coordonnées/couleurs/logo dans `PdfDocumentIdentity`, `PdfHtmlRenderer` et les templates Thymeleaf PDF).

- Flyway : `backend/src/main/resources/db/migration/V0xx__*.sql`, `out-of-order: false`, `baseline-on-migrate`, baseline 0. Dernière migration au 2026-11-22 : `V046__company_profile_branding.sql`. Les tests backend tournent en `create-drop` : une migration n'y est pas exécutée, la valider à part sur un Postgres 15.
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

Angular 21 LTS (`@angular/build:application` esbuild/Vite, Vitest, bootstrap standalone `bootstrapApplication` + `app.config.ts` + `app.routes.ts` — `AppModule` supprimé, voir `docs/adr/ADR-001-frontend-angular-21-architecture.md`). Architecture stricte en **4 couches** (`core/`, `layout/`, `shared/`, `features/`) avec path aliases (`@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*`, alias legacy `src/*` supprimé) vérifiée en CI par `.github/scripts/check-frontend-architecture.py` : routes publiques plein écran (`/login`, `/license`) séparées du shell authentifié `MainLayoutComponent` (`layout/shell/`), et **39 domaines métier** rapatriés dans `src/app/features/<domaine>/` (chacun avec `index.ts`, **100 % lazy-loaded**). Tout nouveau domaine naît dans `src/app/features/<domaine>/` en **standalone + `<domaine>.routes.ts` + `index.ts`** et control flow natif (`@if`/`@for`/`@switch`) — règle `frontend-lazy-loading-migration`.

État : services Angular + RxJS + signals locaux, pas de store global. `Zone.js` conservé explicitement (`provideZoneChangeDetection({ eventCoalescing: true })`), `provideHttpClient(withInterceptorsFromDi())`, intercepteurs dans `core/http/` (`AuthInterceptor`, `LicenseInterceptorService`), `provideAppInitializer` (`FeatureFlagService` + `CompanyBrandingService`), `GoogleAnalyticsService` (`gtag.js` natif). Charte graphique dynamique : `CompanyBrandingService` (`@core/services/`) hydrate les variables CSS `--brand-*` / `--navy-*` / `--teal-*` depuis `localStorage` + revalidation HTTP `ETag` + sync cross-tab `storage`, éditable sous `/administration/entreprise` (`@features/company-settings/`). Gardes : `AuthGuard`, `NgxPermissionsGuard`, `FeatureFlagGuard`, `AiChatGuard`. Notifications & confirmations : `AlertService` uniquement (`ngx-sonner` pour les toasts rapides + `@angular/cdk/dialog` `AlertDialogComponent` pour les modales de confirmation/action/prompt ; plus de `sweetalert2` ni de `confirm()`).

## Mobile

Deux coques : `tabs/` (commercial) et `rm-tabs/` (chef de recouvrement, `RmProfilGuard`). Features : sync, stock, clients, commandes, tontine, recovery, écarts / contrôles carnet, ancien portefeuille, consentement de synchro et consentement journalier.

Règles : écritures métier sur SQLite ; l’API sert au chargement initial et à la synchro explicite ; toute lecture est filtrée par l’utilisateur (`commercialUsername` ou colonne équivalente). NgRx (store, effects, entity). Capacitor : caméra, géoloc, SQLite, imprimante ceinture, Crashlytics, Remote Config.

## Espace client

`customer-space/src/app/features/` : auth, dashboard, purchases, catalog, cart, payment, tontines, notifications, account-deletion, privacy. Variantes `desktop/` à côté des écrans téléphone. Charte graphique dynamique via `CustomerBrandingService` (`APP_INITIALIZER`, cache 3 niveaux `localStorage`/`ETag`/cross-tab, projection sur `--elyk-*` sans altérer la palette wireflow par défaut, logo & nom sur splash, auth mobile/desktop et sidebar desktop). Firebase sert au Remote Config. Les SMS OTP passent par le backend (Notification Hub), plus par Firebase Phone Auth.

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
