# Correction — Marge des ventes à crédit (rapport journalier)

**Date :** 2026-07-08  
**Composant :** Backend  
**Version :** 1.0.19  
**Contexte :** Production — commercial COM010 (rapport journalier)

---

## Problème identifié

Sur le rapport journalier, la carte **« Ventes à Crédit »** affichait une **marge égale au montant total des ventes**.

### Symptôme observé

| Indicateur | Valeur |
|------------|--------|
| Ventes à crédit | 6 ventes — **74 700 FCFA** |
| Marge affichée | **74 700 FCFA** |

À titre de comparaison, la carte **« Sortie Stock »** du même rapport affichait un comportement cohérent : montant **105 350 FCFA**, marge **28 897 FCFA**.

### Cause racine

La marge crédit alimentant le rapport journalier est calculée dans `CreditService.marginAndBIAggregationOperation`, puis propagée via l’événement `CreditStartedEvent` vers `DailyReportEventListener`, qui cumule `creditSalesMargin` dans `DailyCommercialReport`.

L’ancien calcul était :

```java
Double margin = totalAmount - (credit.getTotalPurchase() != null ? credit.getTotalPurchase() : 0.0);
```

Lorsque `totalPurchase` est **absent ou nul**, la marge devient donc :

```
marge = montant de vente − 0 = montant de vente
```

Ce cas se produit notamment sur les crédits dont les **conditions financières sont verrouillées côté mobile** (`mobileFinancialTermsLocked`) : le `totalAmount` est conservé tel quel, mais le coût d’achat (`totalPurchase`) n’est pas toujours renseigné au moment du calcul de la marge.

Le frontend (`daily-report.component.html`) affiche correctement `report.creditSalesMargin` ; le bug est **côté backend**, dans la valeur envoyée à l’agrégation du rapport journalier.

---

## Correction appliquée

Recalcul défensif du coût d’achat via `credit.calculTotalPurchase()` lorsque `totalPurchase` est `null` ou `≤ 0`, avant de calculer la marge :

```java
private void marginAndBIAggregationOperation(Credit credit) {
    Double totalAmount = credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0;
    Double totalPurchase = credit.getTotalPurchase();
    if (totalPurchase == null || totalPurchase <= 0.0) {
        totalPurchase = credit.calculTotalPurchase();
    }
    Double margin = totalAmount - (totalPurchase != null ? totalPurchase : 0.0);
    // ...
}
```

La méthode `calculTotalPurchase()` s’appuie sur les lignes `CreditArticles` (`unitPurchaseCost` ou `purchasePrice` catalogue) pour obtenir le coût réel des articles vendus.

### Effet attendu

- **Nouvelles ventes à crédit** : marge correcte dès la distribution.
- **Rapports journaliers futurs** : `creditSalesMargin` reflète `montant vente − coût d’achat`.
- **Données historiques déjà agrégées** : non recalculées automatiquement ; un backfill peut être nécessaire si des rapports passés doivent être corrigés.

---

## Fichiers modifiés

| Fichier | Nature du changement |
|---------|----------------------|
| `backend/src/main/java/com/optimize/elykia/core/service/sale/CreditService.java` | Correction du calcul de marge dans `marginAndBIAggregationOperation` |
| `backend/src/main/resources/db/migration/V73__backfill_daily_report_credit_sales_margin.sql` | Backfill SQL `credit_sales_margin` sur l’historique |
| `backend/pom.xml` | Incrément de version `1.0.18` → `1.0.22` |
| `docs/CHANGELOG.md` | Entrée **Backend — [1.0.22]** sous la catégorie **Fixed** |

---

## Chaîne fonctionnelle impactée

```
CreditService.marginAndBIAggregationOperation()
    → CreditStartedEvent (margin)
        → DailyReportEventListener.handleCreditStarted()
            → DailyCommercialReport.creditSalesMargin
                → API GET /api/daily-commercial-reports/search
                    → frontend daily-report (carte « Ventes à Crédit »)
```

---

## Backfill SQL (historique)

Migration Flyway : `backend/src/main/resources/db/migration/V73__backfill_daily_report_credit_sales_margin.sql`

Recalcule `credit_sales_margin` pour chaque rapport journalier `(date, commercial_username)` à partir des crédits source, avec la même logique que le correctif Java :

- coût d’achat effectif = `total_purchase` si `> 0`, sinon `SUM(lignes credit_articles)` ;
- par ligne : `unit_purchase_cost × quantity` si renseigné, sinon `articles.purchase_price × quantity` ;
- crédits `TONTINE` exclus (comme `CreditStartedEvent`) ;
- agrégation par `credit.begin_date` et `credit.collector`.

### Vérification avant exécution (lecture seule)

```sql
WITH credit_line_purchase AS (
    SELECT
        ca.credit_id,
        COALESCE(SUM(
            CASE
                WHEN ca.unit_purchase_cost IS NOT NULL AND ca.unit_purchase_cost > 0
                    THEN ca.unit_purchase_cost * ca.quantity
                ELSE COALESCE(a.purchase_price, 0) * ca.quantity
            END
        ), 0) AS calculated_purchase
    FROM credit_articles ca
    JOIN articles a ON a.id = ca.articles_id
    WHERE ca.visibility = 'ENABLED'
    GROUP BY ca.credit_id
),
credit_margin_by_day AS (
    SELECT
        c.begin_date,
        c.collector,
        COALESCE(SUM(
            COALESCE(c.total_amount, 0)
            - COALESCE(
                CASE
                    WHEN c.total_purchase IS NOT NULL AND c.total_purchase > 0
                        THEN c.total_purchase
                    ELSE clp.calculated_purchase
                END,
                0
            )
        ), 0) AS total_margin
    FROM credit c
    LEFT JOIN credit_line_purchase clp ON clp.credit_id = c.id
    WHERE c.visibility = 'ENABLED'
      AND c.type <> 'TONTINE'
      AND c.begin_date IS NOT NULL
      AND c.collector IS NOT NULL
    GROUP BY c.begin_date, c.collector
)
SELECT
    dcr.date,
    dcr.commercial_username,
    dcr.credit_sales_amount,
    dcr.credit_sales_margin AS margin_avant,
    cm.total_margin AS margin_apres,
    dcr.credit_sales_margin - cm.total_margin AS ecart
FROM daily_commercial_report dcr
JOIN credit_margin_by_day cm
  ON dcr.date = cm.begin_date
 AND dcr.commercial_username = cm.collector
WHERE dcr.visibility = 'ENABLED'
  AND ABS(COALESCE(dcr.credit_sales_margin, 0) - cm.total_margin) > 0.01
ORDER BY dcr.date DESC, dcr.commercial_username;
```

Filtre optionnel pour un commercial / une date :

```sql
-- AND c.collector = 'COM010'
-- AND c.begin_date = DATE '2026-07-08'
```

### Backfill partiel manuel (sans migration)

Même CTE `credit_margin_by_day`, puis :

```sql
UPDATE daily_commercial_report dcr
SET
    credit_sales_margin = cm.total_margin,
    date_mod = NOW()
FROM credit_margin_by_day cm
WHERE dcr.date = cm.begin_date
  AND dcr.commercial_username = cm.collector
  AND dcr.visibility = 'ENABLED'
  AND dcr.commercial_username = 'COM010'   -- optionnel
  AND dcr.date = DATE '2026-07-08';        -- optionnel
```

> Les rapports mensuels (`commercial_report_monthly`) dérivés des journaux devront être régénérés si l’historique mensuel doit refléter la correction.

---

## Déploiement

1. Déployer le backend **1.0.22** en production (correctif Java + migration `V73`).
2. Vérifier sur un commercial actif (ex. COM010) qu’une nouvelle vente à crédit produit une marge inférieure au montant de vente.
3. Exécuter la requête de vérification ci-dessus pour contrôler l’écart avant/après backfill.
4. La migration `V73` s’applique au démarrage ; pour un backfill ciblé, utiliser la variante manuelle avec filtres.
