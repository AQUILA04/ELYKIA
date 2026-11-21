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
| **Vague 2** | `notification` (`AppNotification` + `notificationhub`), `organization` (`Agency`, `Locality`, `Promoter`, `Commercial`, `FormerPortfolio`), rapatriement `client_ext` dans `client` | Planifiée |
| **Vague 3** | `inventory` (`catalog` + `stock` + `inventory`, résout le cycle de 60 arêtes) | Planifiée |
| **Vague 4** | `finance` (`expense` + `accounting` + `report` + `debt`, résout le cycle de 46 arêtes) | Planifiée |
| **Vague 5** | `sale` (`Credit`, `Order`, `SaleCancellation`, `RecoveryFieldPlan`, façade `sale::api`) | Planifiée |
| **Vague 6** | `tontine` (`tontine → sale::api` unidirectionnel) + `carnet` (module aval + `CarnetEcartDetectedEvent`) | Planifiée |
| **Vague 7** | `customer` (`Espace Client` + `adhesion` + `paygate` + `ocr`) + `bi` + suppression de `core/` | Planifiée |

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
