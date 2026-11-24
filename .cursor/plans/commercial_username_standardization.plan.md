# Plan 1 — Uniformisation de l'identifiant du commercial vers `commercial_username` (Transition Zéro-Casse & Dépréciation de `collector`)

**Branche cible :** `migration/refactor_commercial_stock` (ou sous-branche dédiée `migration/commercial-username-standardization`).  
**Copie dépôt (après validation) :** `.cursor/plans/commercial_username_standardization.plan.md`.

---

## 1. Diagnostic & Inventaire exhaustif des colonnes en base (`public.*`)

Aujourd'hui, l'identifiant du commercial connecté (`User.username`, ex. `com01`) porte **4 noms différents** selon l'époque à laquelle la table a été créée :
- **`commercial_username`** (déjà standardisé sur **16 tables** récentes : `cash_deposit`, `cash_surplus_reallocation`, `carnet_ecart_decision`, `commercial_mobile_money_config`, `commercial_report_monthly`, `daily_commercial_report`, `daily_operation_log`, `monthly_report_file`, `monthly_report_outbox_entry`, `recovery_manager_operation`, `sale_cancellation_run`, `tontine_catchup_notification`, `tontine_collection`, `tontine_collection_reset_*`, `tontine_delivery`, `tontine_delivery_conflict`, `tontine_member_field_control_line`).
- **`collector`** (et dérivés `old_collector`/`new_collector`/`tontine_collector`/`agency_collector`/`recovery_collector`/`target_collector`) sur **22 tables**.
- **`commercial`** sur `tontine_stock`.
- **`commercial_id`** sur `recovery` et `mobile_transaction`.

### 1.1 Matrice complète des tables à migrer en Itération N (Expand + Backfill + Sync + Deprecate)

| # | Module DDD | Table SQL (`_aud` Envers si applicable) | Colonne(s) actuelle(s) (`@Deprecated`) | Nouvelle(s) colonne(s) canonique(s) | Contrainte & Index à dupliquer |
|---|---|---|---|---|---|
| 1 | `commercialstock` | `commercial_stock_position` | `collector` (`NOT NULL`) | `commercial_username VARCHAR(100) NOT NULL` | Index `(commercial_username, activity_type)`, unique `(commercial_username, article_id, activity_type)` |
| 2 | `commercialstock` | `commercial_stock_ledger_entry` | `collector` (`NOT NULL`) | `commercial_username VARCHAR(100) NOT NULL` | Index `(commercial_username, activity_type, accounting_date)` |
| 3 | `commercialstock` | `commercial_stock_period_snapshot` | `collector` (`NOT NULL`) | `commercial_username VARCHAR(100) NOT NULL` | Unique `(commercial_username, article_id, activity_type, period_grain, ...)` |
| 4 | `sale` | `credit` + `credit_aud` | `collector`, `agency_commercial` | `commercial_username`, `agency_commercial_username` | Index `(commercial_username, status, type)` |
| 5 | `sale` | `credit_timeline` + `credit_timeline_aud` | `collector` | `commercial_username` | Index `(commercial_username, date_reg)` |
| 6 | `sale` | `credit_collector_history` | `old_collector`, `new_collector` | `old_commercial_username`, `new_commercial_username` | Index `(old_commercial_username)`, `(new_commercial_username)` |
| 7 | `sale` | `stock_request` | `collector` | `commercial_username` | Index `(commercial_username, status)` |
| 8 | `sale` | `stock_return` | `collector` | `commercial_username` | Index `(commercial_username, status)` |
| 9 | `sale` | `commercial_monthly_stock` | `collector` | `commercial_username` | Index `(commercial_username, year, month)` |
| 10 | `sale` | `commercial_stock_movement` *(legacy)* | `collector` | `commercial_username` | Index `(commercial_username)` |
| 11 | `tontine` | `stock_tontine_request` | `collector` | `commercial_username` | Index `(commercial_username, status)` |
| 12 | `tontine` | `stock_tontine_return` | `collector` | `commercial_username` | Index `(commercial_username, status)` |
| 13 | `tontine` | `tontine_stock_movement` *(legacy)* | `collector` | `commercial_username` | Index `(commercial_username)` |
| 14 | `tontine` | `tontine_stock` *(legacy)* | `commercial` | `commercial_username` | Index `(commercial_username, year)` |
| 15 | `client` | `client` | `collector`, `tontine_collector`, `agency_collector`, `recovery_collector` | `credit_commercial_username` *(et alias `commercial_username`)*, `tontine_commercial_username`, `agency_commercial_username`, `recovery_commercial_username` | Index sur chacune des 4 colonnes *(voir aussi Plan 2 : table `client_commercial_assignment`)* |
| 16 | `client` | `client_collector_history` | `old_collector`, `new_collector` | `old_commercial_username`, `new_commercial_username` | Index `(client_id, old_commercial_username)` |
| 17 | `finance` | `daily_accountancy` | `collector` | `commercial_username` | Index `(commercial_username, is_opened)` |
| 18 | `finance` | `cash_sales_register_entry` | `collector` | `commercial_username` | Index `(commercial_username)` |
| 19 | `notification` | `app_notification` | `target_collector`, `tontine_collector` | `target_commercial_username`, `tontine_commercial_username` | Index `(target_commercial_username)` |
| 20 | `bi` | `sales_analytics_daily` | `collector` | `commercial_username` | Index `(commercial_username, sale_date)` |
| 21 | `bi` | `collection_analytics_daily` | `collector` | `commercial_username` | Index `(commercial_username, collection_date)` |
| 22 | `bi` | `commercial_performance`, `commercial_performance_monthly` | `collector` | `commercial_username` | Index `(commercial_username)` |
| 23 | `sale` / `bootstrap` | `recovery`, `mobile_transaction` | `commercial_id` | `commercial_username` | Index `(commercial_username)` |

---

## 2. Stratégie technique « Expand → Dual-Write / Trigger Sync → Deprecate → Contract »

> [!IMPORTANT]
> **Pourquoi un trigger PostgreSQL `BEFORE INSERT OR UPDATE` en complément du code Java ?**
> Certaines opérations utilisent du SQL natif ou du JPQL `UPDATE` bulk (ex. `creditRepository.bulkUpdateCollector`, `clientRepository.bulkUpdateCollector`, scripts BI). Un trigger PostgreSQL léger de synchronisation bidirectionnelle garantit à **100 %** qu'aucune ligne ne peut jamais avoir `commercial_username IS NULL` quand `collector` est écrit (et inversement) pendant toute la période de coexistence !

### 2.1 Fonction PostgreSQL générique de synchronisation (Flyway `V050`)

Pour chaque table à colonne simple `(collector ↔ commercial_username)` :
1. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS commercial_username VARCHAR(100);`
2. `UPDATE ... SET commercial_username = collector WHERE commercial_username IS NULL AND collector IS NOT NULL;`
3. Si `collector` était `NOT NULL`, `ALTER TABLE ... ALTER COLUMN commercial_username SET NOT NULL;`
4. Fonction trigger générique :
   ```sql
   CREATE OR REPLACE FUNCTION public.sync_collector_and_commercial_username()
   RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN
       IF TG_OP = 'INSERT' THEN
           NEW.commercial_username := COALESCE(NEW.commercial_username, NEW.collector);
           NEW.collector           := COALESCE(NEW.collector, NEW.commercial_username);
       ELSE
           IF NEW.commercial_username IS DISTINCT FROM OLD.commercial_username THEN
               NEW.collector := NEW.commercial_username;
           ELSIF NEW.collector IS DISTINCT FROM OLD.collector THEN
               NEW.commercial_username := NEW.collector;
           END IF;
       END IF;
       RETURN NEW;
   END;
   $$;
   ```
5. Triggers dédiés pour les tables à paires multiples (`client`, `credit`, `client_collector_history`, `credit_collector_history`, `app_notification`).

### 2.2 Modèle Java / JPA & Contrats REST (Zéro casse Frontend & Mobile)

Dans chaque entité JPA et DTO concerné :
- **Nouveau champ canonique :**
  ```java
  @Column(name = "commercial_username")
  private String commercialUsername;
  ```
- **Ancien champ maintenu et déprécié :**
  ```java
  /** @deprecated Utiliser {@link #commercialUsername}. Conservé pour compatibilité jusqu'à l'itération N+1. */
  @Deprecated(since = "2.14.0", forRemoval = true)
  @Column(name = "collector")
  private String collector;

  public void setCommercialUsername(String commercialUsername) {
      this.commercialUsername = commercialUsername;
      this.collector = commercialUsername;
  }

  @Deprecated(since = "2.14.0", forRemoval = true)
  public void setCollector(String collector) {
      this.collector = collector;
      this.commercialUsername = collector;
  }

  public String getCommercialUsername() {
      return commercialUsername != null ? commercialUsername : collector;
  }
  ```
- **DTOs & Contrôleurs REST :**
  - En **entrée JSON (`@RequestBody`)** : `@JsonAlias({"collector", "commercial"})` sur `commercialUsername` + conservation du setter `setCollector` déprécié → accepte indifféremment `{"commercialUsername": "com01"}` ou `{"collector": "com01"}`.
  - En **paramètres HTTP (`@RequestParam`)** : acceptation des deux paramètres (`@RequestParam(required = false) String commercialUsername, @Deprecated @RequestParam(required = false) String collector`) via un helper `CommercialUsernameParam.resolve(commercialUsername, collector)`.
  - En **sortie JSON** : exposition des **deux** propriétés (`commercialUsername` ET `collector` déprécié) pendant l'itération N pour ne casser ni le Frontend Angular, ni les APK Mobile `3.0.x` déjà sur le terrain.

---

## 3. Découpage en phases livrables

### Phase 1A — Migration SQL `V050__standardize_commercial_username.sql` & Catalogue IA
- Ajout des colonnes `commercial_username` (et variantes `old_/new_/tontine_/agency_/recovery_commercial_username`) sur les 23 tables (+ tables Envers `credit_aud`, `credit_timeline_aud`).
- Backfill complet `UPDATE ... SET commercial_username = collector`.
- Pose des index et des triggers de synchronisation bidirectionnelle.
- Mise à jour de `backend/src/main/resources/ai/schema-catalog.json` : `commercial_username` devient la colonne principale de `rowLevelFilter` et de requêtage Text-to-SQL ; `collector` est annoté `[DEPRECATED — alias de commercial_username]`.

### Phase 1B — Entités, Repositories, Services & Contrôleurs du module `commercialstock` + `sale` + `tontine`
- Bascule interne de `commercialstock` (`CommercialStockPosition`, `CommercialStockLedgerEntry`, `CommercialStockPeriodSnapshot`, `CommercialStockFacade`, `CommercialStockController`) sur `commercialUsername` avec `@Deprecated` sur `collector`.
- Bascule des entités et services `sale` (`Credit`, `CreditTimeline`, `CreditCollectorHistory`, `StockRequest`, `StockReturn`, `CommercialMonthlyStock`, `CommercialStockMovement`, `Recovery`) et `tontine` (`StockTontineRequest`, `StockTontineReturn`, `TontineStock`, `TontineStockMovement`).

### Phase 1C — Modules `client`, `finance`, `notification`, `bi`, `reporting`
- Ajout des propriétés `creditCommercialUsername`, `tontineCommercialUsername`, `agencyCommercialUsername`, `recoveryCommercialUsername` sur `Client` (avec getters/setters synchronisés et `@Deprecated` sur `collector`, `tontineCollector`, `agencyCollector`, `recoveryCollector`).
- Bascule de `DailyAccountancy`, `CashSalesRegisterEntry`, `AppNotification`, tables BI et `MobileTransaction`.

### Phase 1D — Alignement Frontend (`@features/*`) & Mobile (`commercialUsername` déjà natif en SQLite)
- Adoption progressive de `commercialUsername` dans les services Angular tout en gardant la lecture tolérante (`row.commercialUsername ?? row.collector`).

### Phase 2 (Itération N+1 — Nettoyage final / Contract)
- Une fois tous les clients (Frontend + Mobile APK) alignés : migration Flyway supprimant les triggers et les anciennes colonnes `collector`, et retrait des méthodes `@Deprecated(forRemoval = true)`.

---

## 4. Plan de vérification

1. **Test d'intégrité PostgreSQL sur `V050` :**
   - Vérifier pour chacune des 23 tables que `COUNT(*) WHERE commercial_username IS DISTINCT FROM collector == 0`.
   - Vérifier qu'un `INSERT` renseignant uniquement `collector` peuple automatiquement `commercial_username`, et qu'un `INSERT` renseignant uniquement `commercial_username` peuple automatiquement `collector`.
2. **Suite complète Backend (`mvn test`) + `ModularityTests` + Validation Hibernate (`ddl-auto=validate`).**
3. **Suite Frontend (`npm run test:ci`, `npm run build`).**
