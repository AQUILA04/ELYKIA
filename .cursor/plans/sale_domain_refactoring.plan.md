# Plan de refonte — Modélisation du domaine `Sale` (`CREDIT` / `CASH` / `TONTINE`)

> **Statut :** Plan validé par l'utilisateur (2026-11-22), prêt pour exécution incrémentale sur la branche `migration/sale-domain-refactoring` (basée sur le merge complet `migration/architecture-refonte` + `migration/frontend-angular-21` : Backend `2.11.0` / 19 modules Spring Modulith / Flyway `V046`, Frontend `3.1.0` Angular 21, Customer-space `0.18.0`).
> **Règle d'or :** ne jamais fusionner dans `main` avant validation complète.

---

## 1. Constat et objectifs

Historiquement, ELYKIA ne gérait que la vente à crédit ; l'entité centrale a donc été nommée `Credit` (table `credit`). L'ajout ultérieur des ventes **comptant (`CASH`)** et des livraisons **tontine (`TONTINE`)** s'est greffé sur cette même classe :

| Symptôme mesuré | État actuel dans le codebase |
|---|---|
| **God Entity** | `backend/src/main/java/com/optimize/elykia/sale/domain/Credit.java` : **638 lignes**, **45+ colonnes** mélangeant tronc commun vente, échéancier crédit (`dailyStake`, `advance`, `remainingDaysCount`, `creditPurpose`), remise magasin comptant (`pendingWarehouseDelivery`), bricolage tontine (`tontineBuilder()`, valeurs factices dans `TontineCreditCreationService`), 10 colonnes analytiques BI et 3 champs carnet. |
| **Discriminateur non typé** | `OperationType` (`shared.domain`) contient **25 valeurs** hétérogènes (`CASH_DEPOSIT`, `STOCK_RETURN`, `NEW_CLIENT`, `ADHESION_TOP_UP`...) utilisées à la fois pour le journal comptable **et** pour `Credit.type` (`CREDIT`, `CASH`, `TONTINE`). |
| **Branchements dispersés** | **89 branchements** `OperationType.(CREDIT|CASH|TONTINE)` répartis dans **26 fichiers**. |
| **God Service & cycles** | `CreditService.java` : **1 404 lignes** et ~15 `@Autowired` setters circulaires (`@Lazy`), gérant simultanément crédit, comptant, tontine, recherche, collecte et transfert de portefeuille. |
| **God Repository** | `CreditRepository.java` : **1 107 lignes** regroupant tous les cas d'usage. |

### Contraintes impératives de production (zéro casse)
- **Base de données & Envers :** **62 références** SQL/FK dans `db/migration/`, table d'audit Hibernate Envers `credit_aud`, requêtes natives BI/reporting et catalogue IA `backend/src/main/resources/ai/schema-catalog.json` pointent sur la table physique **`credit`**.
  - **Décision ferme :** **ne PAS renommer la table SQL `credit` en `sale`**. Conserver `@Table(name = "credit")` (0 migration destructive, 0 impact `credit_aud`, 0 impact `schema-catalog.json`).
- **Clients externes :** **18 fichiers** côté `frontend/`, `mobile/` (SQLite local-first) et `customer-space/` consomment `/api/v1/credits/**` et le format JSON actuel. Conserver `/api/v1/credits/**` 100 % rétrocompatible.
- **Qualité :** conserver strictement les **6 seuils JaCoCo `0.8.16`** et la vérification **Spring Modulith `2.2.0`** (`ModularityTests`, 19 modules).

---

## 2. Décision d'architecture validée — Option A (Composition + Polymorphisme Java 25)

Plutôt que l'héritage JPA `@Inheritance(SINGLE_TABLE)` (risqué avec Hibernate Envers `credit_aud`, proxies LAZY `instanceof`, et données legacy potentiellement `NULL` sur `type`), on applique l'**Option A** :

- **Agrégat `Sale` unifié** mappé sur `@Table(name = "credit")` (mêmes colonnes physiques).
- **Enum métier typé `SaleType { CREDIT, CASH, TONTINE }`** (mappé sur la colonne `type` existante, valeurs SQL identiques `'CREDIT'`, `'CASH'`, `'TONTINE'`).
- **Polymorphisme comportemental exhaustif Java 25** via `sealed interface SaleLifecyclePolicy permits CreditSalePolicy, CashSalePolicy, TontineSalePolicy` + résolveur `SaleLifecyclePolicies.forType(SaleType)`.
- **Objets-valeur JPA `@Embeddable`** pour structurer l'agrégat sans changer une seule colonne SQL :
  - `CreditTerms` (échéancier, avance, mise journalière, solvabilité, verrou mobile, consentement),
  - `CashDeliveryState` (`pendingWarehouseDelivery`),
  - `CarnetCertification` (`carnetVerified*`),
  - `SaleBiMetrics` (10 colonnes BI).
- **Services applicatifs cohésifs** remplaçant le monolithe `CreditService` (1 404 LOC) et **dépôts spécialisés** remplaçant le monolithe `CreditRepository` (1 107 LOC).

---

## 3. Feuille de route en 4 phases incrémentales (chaque phase = 1 PR livrable)

### Phase 1 — Typage fort `SaleType` & Polymorphisme comportemental (`SaleLifecyclePolicy`)
1. Créer `com.optimize.elykia.sale.domain.SaleType` (`CREDIT`, `CASH`, `TONTINE`) avec passerelles explicites `fromOperationType(OperationType)` / `toOperationType()`.
2. Créer `com.optimize.elykia.sale.domain.policy.SaleLifecyclePolicy` (`sealed interface`) + `CreditSalePolicy`, `CashSalePolicy`, `TontineSalePolicy` + `SaleLifecyclePolicies.forType(SaleType)` (`switch` exhaustif).
   - Méthodes portées par les politiques : `initializeFinancialTerms`, `validateBeforeStart`, `statusOnStart`, `resolveFallbackUnitPrice`, `assertDailyStakeChangeAllowed`, `assertSoftDeleteAllowed`, `publishesCreditStartedEvent`.
3. Adapter `Credit` :
   - Exposer `getSaleType()`, `isCredit()`, `isCash()`, `isTontine()` (tout en gardant `getType()/setType(OperationType)` en Phase 1 pour 0 rupture).
   - Déléguer `checkAdvance()`, `start()`, `resolveArticleLineUnitPrice()`, `checkInProgressStatus()` aux politiques.
   - Ajouter les fabriques explicites `Credit.newCredit(...)`, `Credit.newCashSale(...)`, `Credit.newTontineSale(...)` et simplifier `TontineCreditCreationService.buildFromDelivery()`.
4. Tests unitaires exhaustifs : `SaleTypeTest`, `CreditSalePolicyTest`, `CashSalePolicyTest`, `TontineSalePolicyTest`.

### Phase 2 — Éclatement de `CreditService` (1 404 LOC) & `CreditRepository` (1 107 LOC)
1. Extraire 5 services applicatifs cohésifs dans `com.optimize.elykia.sale.application` (injection par constructeur, suppression progressive des ~15 `@Autowired` setters circulaires) :
   - **`CashSaleService`** (~220 LOC) : `createCashSale`, `updateCashSale`, `settleCashSaleOnDelivery`, `cancelPendingCashSale`.
   - **`CreditSaleService`** (~380 LOC) : création/mise à jour crédit, `transformOrderToCredit`, `creditUnicity`, `creditControlProcess`, `validateCredit`, `startCredit`, `distributeArticlesV2`, `changeDailyStake`, `syncClientCreditFlagsAfterClose`.
   - **`TontineSaleService`** (~100 LOC) : `createTontineSale(...)` (appelé par `TontineCreditCreationService`).
   - **`SaleCollectorService`** (~150 LOC) : `changeCollector`, `bulkChangeCollector`, `getCollectorHistory`.
   - **`SaleQueryService`** (~280 LOC) : `searchCredits`, `elasticsearch`, `getCreditByCollector*`, `getAll*`, `getClientDetails`, `getByIdWithSourceStocks`, `getClientReliquatAmount`, `getTimelines*`, `getDelayedCreditsByCommercial`, `getEndingCreditsByCommercial`.
2. Conserver `CreditService` en mince façade de délégation (< 150 LOC) le temps de basculer `CreditController` et les appelants internes.
3. Scinder `CreditRepository` (1 107 LOC) en 3 dépôts :
   - `CreditRepository` (CRUD & cœur),
   - `CreditRecoveryQueryRepository` (recouvrement journalier, retards, échéances),
   - `SaleSearchQueryRepository` (recherche multi-critères, résumés de liste, export articles vendus).

### Phase 3 — Composition `@Embeddable` & renommage Java `Credit` → `Sale`
1. Extraire les 4 objets-valeur `@Embeddable` mappés sur les colonnes existantes de `credit` (`CreditTerms`, `CashDeliveryState`, `CarnetCertification`, `SaleBiMetrics`).
2. Vérifier en base qu'aucun flux actif n'écrit les champs `@Deprecated` (`parent`, `updatable`) avant tout nettoyage.
3. Renommer (si confirmé à l'entrée de la Phase 3) l'entité Java `Credit` → `Sale` (`@Table(name = "credit")`) et `CreditArticles` → `SaleLine` (`@Table(name = "credit_articles")`), et passer le champ persisté `type` en `SaleType`.

### Phase 4 — Façade REST & fermeture stricte du module `sale`
1. Maintenir `/api/v1/credits/**` (`CreditController`) 100 % rétrocompatible pour `frontend/`, `mobile/` et `customer-space/`.
2. Optionnellement exposer `/api/v1/sales/**` (ex. `/api/v1/sales/cash`, `/api/v1/sales/credit`) pour les futurs écrans.
3. Durcir le module Spring Modulith `sale` de `OPEN` vers `CLOSED` avec `@NamedInterface("api")` (`SaleFacade`, `SaleType`, événements de vente).

---

## 4. Plan de vérification (obligatoire à chaque phase)

1. **Build & tests complets :**
   ```bash
   JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64 mvn -B -f backend/pom.xml clean verify
   ```
   - 100 % des tests PASS (`ModularityTests` sur les 19 modules + tous les tests unitaires et Testcontainers).
   - Tous les **6 seuils JaCoCo `0.8.16`** respectés sans aucun abaissement.
2. **Validation Hibernate / Envers sur PostgreSQL 15 réel :**
   - Démarrage `SPRING_PROFILES_ACTIVE=prod`, `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`, `SPRING_FLYWAY_ENABLED=true` (`V000→V046`), `/actuator/health` = `UP`.
3. **Documentation & Changelog :**
   - Mettre à jour `docs/CHANGELOG.md`, `memory-bank/{activeContext,systemPatterns,techContext}.md` et incrémenter la version dans `backend/pom.xml` à chaque phase livrée.
