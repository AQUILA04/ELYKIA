# BI Dashboard - TODO : Optimisations Futures

## 📋 Statut : À Implémenter Selon les Besoins de Performance

**Date de création :** 18 novembre 2025  
**Priorité :** MOYENNE (à évaluer après mise en production)  
**Impact :** Optimisation des performances pour charges élevées

---

## 🎯 Objectif

Optimiser les performances du système BI Dashboard en ajoutant des **vues matérialisées** pour les requêtes fréquentes et complexes. Ces optimisations ne sont nécessaires que si les performances actuelles deviennent insuffisantes.

---

## ⚠️ Quand Implémenter ?

Implémenter ces optimisations SI :
- ✅ Les requêtes BI prennent plus de 2-3 secondes
- ✅ La charge sur la base de données est élevée (>70% CPU)
- ✅ Le nombre de crédits dépasse 10,000
- ✅ Le nombre d'utilisateurs simultanés dépasse 50
- ✅ Les rapports sont générés très fréquemment (>100/jour)

**Sinon, l'implémentation actuelle est suffisante !**

---

## 📊 Vues Matérialisées à Créer

### Vue 1 : sales_analytics_daily

**Objectif :** Pré-calculer les métriques de ventes quotidiennes

**Script SQL :**
```sql
CREATE MATERIALIZED VIEW sales_analytics_daily AS
SELECT 
    DATE(c.accounting_date) as sale_date,
    c.collector,
    c.client_type,
    COUNT(c.id) as sales_count,
    SUM(c.total_amount) as total_sales,
    SUM(c.total_purchase) as total_cost,
    SUM(c.total_amount - c.total_purchase) as total_profit,
    AVG(c.total_amount) as avg_sale_amount,
    SUM(c.total_amount_paid) as total_collected,
    COUNT(CASE WHEN c.status = 'SETTLED' THEN 1 END) as settled_count
FROM credit c
WHERE c.accounting_date IS NOT NULL
GROUP BY DATE(c.accounting_date), c.collector, c.client_type;

CREATE UNIQUE INDEX idx_sales_analytics_date_collector 
    ON sales_analytics_daily(sale_date, collector, client_type);
CREATE INDEX idx_sales_analytics_date ON sales_analytics_daily(sale_date);
CREATE INDEX idx_sales_analytics_collector ON sales_analytics_daily(collector);
```

**Rafraîchissement :**
```sql
-- Quotidien à 2h du matin (après le snapshot)
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics_daily;
```

**Utilisation :**
- Remplace les calculs dans `BiSalesAnalyticsService.getSalesTrends()`
- Accélère les requêtes de tendances
- Réduit la charge sur la table `credit`

---

### Vue 2 : collection_analytics_daily

**Objectif :** Pré-calculer les métriques de recouvrement quotidiennes

**Script SQL :**
```sql
CREATE MATERIALIZED VIEW collection_analytics_daily AS
SELECT 
    DATE(ct.created_date) as collection_date,
    c.collector,
    COUNT(ct.id) as payment_count,
    SUM(ct.amount) as total_collected,
    AVG(ct.amount) as avg_payment,
    COUNT(CASE WHEN cpe.is_on_time = true THEN 1 END) as on_time_count,
    COUNT(CASE WHEN cpe.is_on_time = false THEN 1 END) as late_count
FROM credit_timeline ct
JOIN credit c ON ct.credit_id = c.id
LEFT JOIN credit_payment_event cpe ON cpe.credit_id = c.id 
    AND DATE(cpe.payment_date) = DATE(ct.created_date)
GROUP BY DATE(ct.created_date), c.collector;

CREATE UNIQUE INDEX idx_collection_analytics_date_collector 
    ON collection_analytics_daily(collection_date, collector);
CREATE INDEX idx_collection_analytics_date ON collection_analytics_daily(collection_date);
```

**Rafraîchissement :**
```sql
-- Quotidien à 2h du matin
REFRESH MATERIALIZED VIEW CONCURRENTLY collection_analytics_daily;
```

**Utilisation :**
- Remplace les calculs dans `BiCollectionAnalyticsService.getCollectionTrends()`
- Accélère les analyses de recouvrement
- Réduit les jointures complexes

---

### Vue 3 : stock_analytics

**Objectif :** Pré-calculer les métriques de stock et rotation

**Script SQL :**
```sql
CREATE MATERIALIZED VIEW stock_analytics AS
SELECT 
    a.id as article_id,
    a.name,
    a.category,
    a.stock_quantity,
    a.purchase_price,
    a.credit_sale_price,
    (a.stock_quantity * a.purchase_price) as stock_value,
    (a.credit_sale_price - a.purchase_price) as unit_margin,
    a.reorder_point,
    a.optimal_stock_level,
    CASE 
        WHEN a.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN a.stock_quantity <= a.reorder_point THEN 'LOW_STOCK'
        WHEN a.stock_quantity > a.optimal_stock_level THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status,
    -- Ventes des 30 derniers jours
    COALESCE(
        (SELECT SUM(sm.quantity) 
         FROM stock_movement sm
         WHERE sm.article_id = a.id 
         AND sm.movement_type = 'RELEASE'
         AND sm.movement_date >= CURRENT_DATE - INTERVAL '30 days'),
        0
    ) as sales_last_30_days,
    -- Taux de rotation
    CASE 
        WHEN a.stock_quantity > 0 THEN
            COALESCE(
                (SELECT SUM(sm.quantity) 
                 FROM stock_movement sm
                 WHERE sm.article_id = a.id 
                 AND sm.movement_type = 'RELEASE'
                 AND sm.movement_date >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) / NULLIF(a.stock_quantity, 0)
        ELSE 0
    END as turnover_rate_30d
FROM articles a
WHERE a.state = 'ENABLED';

CREATE UNIQUE INDEX idx_stock_analytics_article ON stock_analytics(article_id);
CREATE INDEX idx_stock_analytics_status ON stock_analytics(stock_status);
CREATE INDEX idx_stock_analytics_category ON stock_analytics(category);
```

**Rafraîchissement :**
```sql
-- Toutes les heures pendant les heures ouvrables
REFRESH MATERIALIZED VIEW CONCURRENTLY stock_analytics;
```

**Utilisation :**
- Remplace les calculs dans `BiStockAnalyticsService`
- Accélère les alertes de stock
- Pré-calcule les rotations

---

### Vue 4 : commercial_performance_monthly

**Objectif :** Pré-calculer les performances mensuelles des commerciaux

**Script SQL :**
```sql
CREATE MATERIALIZED VIEW commercial_performance_monthly AS
SELECT 
    c.collector,
    DATE_TRUNC('month', c.accounting_date) as month,
    COUNT(DISTINCT c.id) as total_sales,
    SUM(c.total_amount) as total_revenue,
    SUM(c.total_amount - c.total_purchase) as total_profit,
    AVG(c.total_amount) as avg_sale,
    SUM(c.total_amount_paid) as total_collected,
    (SUM(c.total_amount_paid) / NULLIF(SUM(c.total_amount), 0) * 100) as collection_rate,
    COUNT(DISTINCT c.client_id) as active_clients,
    COUNT(CASE WHEN c.solvency_note = 'LATE' THEN 1 END) as late_credits,
    SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE 
        THEN c.total_amount_remaining ELSE 0 END) as portfolio_at_risk
FROM credit c
WHERE c.accounting_date IS NOT NULL
GROUP BY c.collector, DATE_TRUNC('month', c.accounting_date);

CREATE UNIQUE INDEX idx_commercial_perf_monthly_collector_month 
    ON commercial_performance_monthly(collector, month);
CREATE INDEX idx_commercial_perf_monthly_month ON commercial_performance_monthly(month);
```

**Rafraîchissement :**
```sql
-- Quotidien à 3h du matin
REFRESH MATERIALIZED VIEW CONCURRENTLY commercial_performance_monthly;
```

**Utilisation :**
- Remplace les calculs dans `BiSalesAnalyticsService.getCommercialRanking()`
- Accélère les classements
- Historique pré-calculé

---

### Vue 5 : portfolio_overview

**Objectif :** Vue d'ensemble du portefeuille en temps quasi-réel

**Script SQL :**
```sql
CREATE MATERIALIZED VIEW portfolio_overview AS
SELECT 
    COUNT(CASE WHEN status = 'INPROGRESS' THEN 1 END) as active_credits,
    SUM(CASE WHEN status = 'INPROGRESS' THEN total_amount_remaining ELSE 0 END) as total_outstanding,
    SUM(CASE WHEN status = 'INPROGRESS' AND expected_end_date < CURRENT_DATE 
        THEN total_amount_remaining ELSE 0 END) as total_overdue,
    SUM(CASE WHEN status = 'INPROGRESS' AND expected_end_date < CURRENT_DATE - INTERVAL '7 days'
        THEN total_amount_remaining ELSE 0 END) as par_7,
    SUM(CASE WHEN status = 'INPROGRESS' AND expected_end_date < CURRENT_DATE - INTERVAL '15 days'
        THEN total_amount_remaining ELSE 0 END) as par_15,
    SUM(CASE WHEN status = 'INPROGRESS' AND expected_end_date < CURRENT_DATE - INTERVAL '30 days'
        THEN total_amount_remaining ELSE 0 END) as par_30,
    AVG(CASE WHEN status = 'SETTLED' THEN actual_duration_days END) as avg_credit_duration,
    COUNT(CASE WHEN solvency_note = 'EARLY' THEN 1 END) as early_payers,
    COUNT(CASE WHEN solvency_note = 'TIME' THEN 1 END) as on_time_payers,
    COUNT(CASE WHEN solvency_note = 'LATE' THEN 1 END) as late_payers,
    CURRENT_TIMESTAMP as last_refresh
FROM credit;

CREATE INDEX idx_portfolio_overview_refresh ON portfolio_overview(last_refresh);
```

**Rafraîchissement :**
```sql
-- Toutes les 15 minutes pendant les heures ouvrables
REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_overview;
```

**Utilisation :**
- Remplace les calculs dans `BiDashboardService.getPortfolioMetrics()`
- Dashboard ultra-rapide
- Métriques pré-calculées

---

## 🔄 Stratégie de Rafraîchissement

### Option 1 : Scheduler PostgreSQL (Recommandé)

Créer une extension pg_cron :
```sql
-- Activer pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Rafraîchir sales_analytics_daily tous les jours à 2h
SELECT cron.schedule('refresh-sales-analytics', '0 2 * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics_daily');

-- Rafraîchir collection_analytics_daily tous les jours à 2h
SELECT cron.schedule('refresh-collection-analytics', '0 2 * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY collection_analytics_daily');

-- Rafraîchir stock_analytics toutes les heures de 8h à 20h
SELECT cron.schedule('refresh-stock-analytics', '0 8-20 * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY stock_analytics');

-- Rafraîchir commercial_performance_monthly tous les jours à 3h
SELECT cron.schedule('refresh-commercial-perf', '0 3 * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY commercial_performance_monthly');

-- Rafraîchir portfolio_overview toutes les 15 minutes
SELECT cron.schedule('refresh-portfolio', '*/15 * * * *', 
    'REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_overview');
```

### Option 2 : Scheduler Spring Boot

Ajouter dans `BiScheduler.java` :
```java
@Scheduled(cron = "0 0 2 * * *") // 2h du matin
public void refreshMaterializedViews() {
    try {
        log.info("Rafraîchissement des vues matérialisées...");
        entityManager.createNativeQuery(
            "REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics_daily"
        ).executeUpdate();
        entityManager.createNativeQuery(
            "REFRESH MATERIALIZED VIEW CONCURRENTLY collection_analytics_daily"
        ).executeUpdate();
        // ... autres vues
        log.info("Vues matérialisées rafraîchies avec succès");
    } catch (Exception e) {
        log.error("Erreur lors du rafraîchissement des vues", e);
    }
}
```

---

## 📝 Script de Migration Flyway

**Fichier :** `V2__bi_dashboard_materialized_views.sql`

```sql
-- =====================================================
-- Migration Flyway - Vues Matérialisées BI Dashboard
-- À exécuter uniquement si nécessaire pour les performances
-- =====================================================

-- Vue 1: Analytiques de ventes quotidiennes
CREATE MATERIALIZED VIEW sales_analytics_daily AS
-- [Copier le SQL de la Vue 1 ci-dessus]

-- Vue 2: Analytiques de recouvrement quotidiennes
CREATE MATERIALIZED VIEW collection_analytics_daily AS
-- [Copier le SQL de la Vue 2 ci-dessus]

-- Vue 3: Analytiques de stock
CREATE MATERIALIZED VIEW stock_analytics AS
-- [Copier le SQL de la Vue 3 ci-dessus]

-- Vue 4: Performances commerciales mensuelles
CREATE MATERIALIZED VIEW commercial_performance_monthly AS
-- [Copier le SQL de la Vue 4 ci-dessus]

-- Vue 5: Vue d'ensemble du portefeuille
CREATE MATERIALIZED VIEW portfolio_overview AS
-- [Copier le SQL de la Vue 5 ci-dessus]

-- Rafraîchissement initial
REFRESH MATERIALIZED VIEW sales_analytics_daily;
REFRESH MATERIALIZED VIEW collection_analytics_daily;
REFRESH MATERIALIZED VIEW stock_analytics;
REFRESH MATERIALIZED VIEW commercial_performance_monthly;
REFRESH MATERIALIZED VIEW portfolio_overview;
```

---

## 🔧 Modifications des Services

### BiDashboardService

```java
// AVANT (calcul en temps réel)
public PortfolioMetricsDto getPortfolioMetrics() {
    List<Credit> activeCredits = creditRepository.findByStatus(CreditStatus.INPROGRESS);
    // ... calculs complexes
}

// APRÈS (lecture de la vue matérialisée)
public PortfolioMetricsDto getPortfolioMetrics() {
    String sql = "SELECT * FROM portfolio_overview LIMIT 1";
    // Mapper directement les résultats
    // Beaucoup plus rapide !
}
```

### BiSalesAnalyticsService

```java
// AVANT
public List<SalesTrendDto> getSalesTrends(LocalDate startDate, LocalDate endDate) {
    List<Credit> credits = creditRepository.findByAccountingDateBetween(startDate, endDate);
    // ... groupBy et calculs
}

// APRÈS
public List<SalesTrendDto> getSalesTrends(LocalDate startDate, LocalDate endDate) {
    String sql = "SELECT * FROM sales_analytics_daily WHERE sale_date BETWEEN :start AND :end";
    // Lecture directe, déjà agrégé !
}
```

---

## 📊 Gains de Performance Attendus

| Requête | Avant | Après | Gain |
|---------|-------|-------|------|
| Dashboard Overview | 2-3s | 0.1-0.2s | **90%** |
| Tendances Ventes | 1-2s | 0.05-0.1s | **95%** |
| Classement Commerciaux | 1.5-2.5s | 0.1-0.2s | **92%** |
| Alertes Stock | 0.5-1s | 0.05-0.1s | **90%** |
| Analyse Retards | 1-1.5s | 0.1-0.15s | **90%** |

**Gain global estimé : 90-95% de réduction du temps de réponse**

---

## ⚠️ Considérations Importantes

### Avantages
✅ Performances drastiquement améliorées  
✅ Réduction de la charge sur la base de données  
✅ Réponses quasi-instantanées  
✅ Scalabilité améliorée  

### Inconvénients
❌ Données légèrement décalées (selon fréquence de rafraîchissement)  
❌ Espace disque supplémentaire requis  
❌ Complexité de maintenance accrue  
❌ Temps de rafraîchissement à gérer  

### Recommandations
1. **Commencer sans les vues** et monitorer les performances
2. **Implémenter progressivement** : commencer par portfolio_overview
3. **Ajuster les fréquences** de rafraîchissement selon les besoins
4. **Monitorer l'espace disque** utilisé par les vues
5. **Documenter** les changements dans le code

---

## 📈 Métriques à Surveiller

Avant d'implémenter, surveiller :
- ⏱️ Temps de réponse moyen des endpoints BI
- 💾 Utilisation CPU de la base de données
- 📊 Nombre de requêtes BI par minute
- 👥 Nombre d'utilisateurs simultanés
- 🔄 Fréquence de génération des rapports

**Seuils d'alerte :**
- Temps de réponse > 2 secondes → Envisager les vues
- CPU DB > 70% → Implémenter les vues
- Requêtes BI > 100/min → Implémenter les vues

---

## ✅ Checklist d'Implémentation

Quand vous décidez d'implémenter :

- [ ] Sauvegarder la base de données
- [ ] Créer le script V2__bi_dashboard_materialized_views.sql
- [ ] Tester en environnement de développement
- [ ] Mesurer les gains de performance
- [ ] Configurer le rafraîchissement automatique
- [ ] Modifier les services pour utiliser les vues
- [ ] Tester tous les endpoints
- [ ] Monitorer l'espace disque
- [ ] Documenter les changements
- [ ] Déployer en production
- [ ] Surveiller les performances

---

## 📞 Support

Pour toute question sur l'implémentation des vues matérialisées :
1. Consulter la documentation PostgreSQL sur les vues matérialisées
2. Tester d'abord en développement
3. Mesurer les gains réels avant/après
4. Ajuster selon vos besoins spécifiques

---

**Statut :** 📋 TODO - À implémenter selon les besoins  
**Priorité :** MOYENNE  
**Effort estimé :** 2-3 jours  
**Impact :** Amélioration des performances de 90-95%  

---

**Note :** L'implémentation actuelle est **suffisante pour la plupart des cas d'usage**. N'implémenter les vues matérialisées que si les performances deviennent un problème réel.
