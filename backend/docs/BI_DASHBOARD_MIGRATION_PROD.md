# BI Dashboard - Plan de Migration en Production

## ⚠️ IMPORTANT : Application en Production

Ce document détaille comment migrer le système BI Dashboard sur une application **déjà en production** avec des données existantes.

---

## 🎯 Objectif

Déployer le BI Dashboard **sans perturber** les opérations existantes et en gérant correctement les données historiques.

---

## 📊 Analyse d'Impact

### ✅ Aucun Impact (Safe)

1. **Nouvelles tables** : Créées vides, aucun impact
2. **Nouvelles colonnes** : Ajoutées avec NULL autorisé
3. **Nouveaux services** : N'affectent pas les processus existants
4. **Nouveaux endpoints** : Additionnels, pas de modification des existants

### ⚠️ Impact Limité (Gérable)

1. **Données historiques incomplètes** : Les anciens crédits n'auront pas toutes les métriques BI
2. **Pas d'historique de paiements** : `credit_payment_event` vide au départ
3. **Pas d'historique de stock** : `stock_movement` vide au départ

### ❌ Risques Potentiels

1. **Performance** : Nouvelles colonnes peuvent ralentir les requêtes sur `credit`
2. **Espace disque** : 4 nouvelles tables + 18 colonnes
3. **Calculs rétroactifs** : Le UPDATE initial peut prendre du temps

---

## 🚀 Plan de Migration (5 Étapes)

### Étape 1 : Préparation (Avant le déploiement)

#### 1.1 Sauvegarde Complète
```bash
# Backup de la base de données
pg_dump -h localhost -U postgres -d elykia_db > backup_avant_bi_$(date +%Y%m%d).sql

# Vérifier la taille du backup
ls -lh backup_avant_bi_*.sql
```

#### 1.2 Estimation de l'Impact
```sql
-- Compter les crédits existants
SELECT COUNT(*) FROM credit;

-- Compter les articles
SELECT COUNT(*) FROM articles;

-- Estimer le temps de UPDATE (test sur 1000 lignes)
EXPLAIN ANALYZE
UPDATE credit SET 
    profit_margin = total_amount - total_purchase
WHERE id IN (SELECT id FROM credit LIMIT 1000);
```

#### 1.3 Tester en Environnement de Staging
1. Copier la base de production vers staging
2. Exécuter le script de migration
3. Vérifier que tout fonctionne
4. Mesurer le temps d'exécution

---

### Étape 2 : Migration de la Base de Données

#### 2.1 Fenêtre de Maintenance (Recommandé)
```
Planifier une fenêtre de 30-60 minutes
Idéalement en heures creuses (nuit ou weekend)
```

#### 2.2 Exécution du Script SQL

**Option A : Exécution Complète** (Si fenêtre de maintenance)
```bash
psql -h localhost -U postgres -d elykia_db -f src/main/resources/db/migration/03_V1__bi_dashboard_entities.sql
```

**Option B : Exécution Progressive** (Sans interruption)
```sql
-- 1. Créer les nouvelles tables (rapide, aucun lock)
CREATE TABLE IF NOT EXISTS credit_payment_event (...);
CREATE TABLE IF NOT EXISTS stock_movement (...);
CREATE TABLE IF NOT EXISTS commercial_performance (...);
CREATE TABLE IF NOT EXISTS daily_business_snapshot (...);

-- 2. Ajouter les colonnes (rapide, lock minimal)
ALTER TABLE credit ADD COLUMN IF NOT EXISTS profit_margin DOUBLE PRECISION;
-- ... autres colonnes

ALTER TABLE articles ADD COLUMN IF NOT EXISTS reorder_point INTEGER;
-- ... autres colonnes

-- 3. Créer les index (peut être long)
CREATE INDEX IF NOT EXISTS idx_payment_event_credit ON credit_payment_event(credit_id);
-- ... autres index

-- 4. Mise à jour des données (ATTENTION : peut être long)
-- Faire par lots pour éviter les locks prolongés
UPDATE credit SET 
    profit_margin = COALESCE(total_amount, 0) - COALESCE(total_purchase, 0),
    payment_completion_rate = CASE 
        WHEN COALESCE(total_amount, 0) > 0 
        THEN (COALESCE(total_amount_paid, 0) / total_amount) * 100 
        ELSE 0 
    END,
    risk_level = 'LOW',
    season_period = CASE 
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 1 AND 3 THEN 'Q1'
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 4 AND 6 THEN 'Q2'
        WHEN EXTRACT(MONTH FROM accounting_date) BETWEEN 7 AND 9 THEN 'Q3'
        ELSE 'Q4'
    END
WHERE profit_margin IS NULL
  AND id IN (SELECT id FROM credit WHERE profit_margin IS NULL LIMIT 1000);
-- Répéter jusqu'à ce que toutes les lignes soient mises à jour
```

#### 2.3 Vérification Post-Migration
```sql
-- Vérifier que les tables sont créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('credit_payment_event', 'stock_movement', 'commercial_performance', 'daily_business_snapshot');

-- Vérifier que les colonnes sont ajoutées
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'credit' 
AND column_name IN ('profit_margin', 'risk_level', 'season_period');

-- Vérifier les données mises à jour
SELECT COUNT(*) FROM credit WHERE profit_margin IS NOT NULL;
SELECT COUNT(*) FROM credit WHERE risk_level IS NOT NULL;

-- Vérifier les index
SELECT indexname FROM pg_indexes WHERE tablename = 'credit_payment_event';
```

---

### Étape 3 : Déploiement de l'Application

#### 3.1 Déploiement du Code
```bash
# Build de l'application
./mvnw clean package -DskipTests

# Déploiement (selon votre méthode)
# - Docker: docker-compose up -d
# - JAR: java -jar target/elykia-core.jar
# - Kubernetes: kubectl apply -f deployment.yaml
```

#### 3.2 Vérification du Démarrage
```bash
# Vérifier les logs
tail -f logs/application.log

# Chercher les erreurs liées au BI
grep -i "bi" logs/application.log
grep -i "error" logs/application.log
```

#### 3.3 Tests de Santé
```bash
# Test de l'API principale
curl -X GET "http://localhost:8080/actuator/health"

# Test d'un endpoint BI
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Étape 4 : Gestion des Données Historiques

#### 4.1 Données Existantes - Ce qui est Calculé

✅ **Automatiquement calculé par le script SQL :**
- `profit_margin` : Marge bénéficiaire
- `profit_margin_percentage` : Pourcentage de marge
- `payment_completion_rate` : Taux de complétion
- `risk_level` : Niveau de risque (LOW par défaut)
- `season_period` : Période saisonnière (Q1-Q4)

#### 4.2 Données Existantes - Ce qui Manque

❌ **Non disponible pour les anciens crédits :**
- `payment_regularity_score` : Nécessite l'historique des paiements
- `expected_duration_days` / `actual_duration_days` : Peut être calculé si dates disponibles
- `distribution_zone` / `customer_segment` : Nécessite des données métier

#### 4.3 Migration Optionnelle de l'Historique des Paiements

**Si vous voulez reconstruire l'historique :**

```sql
-- Reconstruire les événements de paiement depuis credit_timeline
INSERT INTO credit_payment_event (
    credit_id, 
    payment_date, 
    amount, 
    payment_method,
    is_on_time,
    days_from_last_payment,
    created_date
)
SELECT 
    ct.credit_id,
    ct.created_date,
    ct.amount,
    'CASH',  -- Valeur par défaut
    true,    -- Supposer à temps par défaut
    0,       -- À calculer si nécessaire
    ct.created_date
FROM credit_timeline ct
WHERE ct.created_date >= '2025-01-01'  -- Limiter à une période récente
ORDER BY ct.credit_id, ct.created_date;

-- Recalculer les scores de régularité
-- (Nécessite un script Java ou une procédure stockée)
```

**⚠️ Attention :** Cette migration peut être longue et complexe. Évaluer si nécessaire.

---

### Étape 5 : Monitoring Post-Déploiement

#### 5.1 Surveiller les Performances

```sql
-- Vérifier les requêtes lentes
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%credit%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Vérifier la taille des tables
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('credit', 'articles', 'credit_payment_event', 'stock_movement')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 5.2 Vérifier les Logs Applicatifs

```bash
# Vérifier les erreurs BI
grep -i "BiDashboard\|CreditEnrichment\|StockMovement" logs/application.log

# Vérifier le scheduler
grep -i "BiScheduler\|snapshot\|performance" logs/application.log
```

#### 5.3 Tester les Fonctionnalités BI

```bash
# 1. Dashboard overview
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview"

# 2. Créer un nouveau crédit et vérifier l'enrichissement
# (Utiliser l'API existante)

# 3. Effectuer un paiement et vérifier le tracking
# (Utiliser l'API existante)

# 4. Vérifier le snapshot quotidien (lendemain)
SELECT * FROM daily_business_snapshot ORDER BY snapshot_date DESC LIMIT 1;
```

---

## 📝 Checklist de Migration

### Avant le Déploiement
- [ ] Backup complet de la base de données
- [ ] Test en environnement de staging
- [ ] Estimation du temps de migration
- [ ] Planification de la fenêtre de maintenance
- [ ] Communication aux utilisateurs

### Pendant le Déploiement
- [ ] Exécution du script SQL
- [ ] Vérification des tables créées
- [ ] Vérification des colonnes ajoutées
- [ ] Vérification des données mises à jour
- [ ] Déploiement de l'application
- [ ] Vérification du démarrage

### Après le Déploiement
- [ ] Tests des endpoints BI
- [ ] Vérification des logs
- [ ] Monitoring des performances
- [ ] Vérification du scheduler (lendemain)
- [ ] Documentation des limitations

---

## ⚠️ Limitations Connues

### 1. Données Historiques Incomplètes

**Limitation :**
- Les anciens crédits n'auront pas de score de régularité
- Pas d'historique dans `credit_payment_event` avant le déploiement
- Pas d'historique dans `stock_movement` avant le déploiement

**Impact :**
- Les analyses de régularité ne seront précises que pour les nouveaux crédits
- Les analyses de rotation de stock seront basées sur les données post-déploiement

**Mitigation :**
- Documenter clairement cette limitation
- Afficher un message dans le dashboard : "Données disponibles à partir du [date de déploiement]"
- Optionnel : Migrer l'historique des paiements (voir Étape 4.3)

### 2. Performance sur Gros Volumes

**Limitation :**
- Le UPDATE initial peut prendre du temps sur des millions de lignes
- Les nouvelles colonnes augmentent la taille de la table `credit`

**Mitigation :**
- Exécuter le UPDATE par lots (LIMIT 1000)
- Planifier une fenêtre de maintenance
- Monitorer les performances après déploiement

### 3. Scheduler et Données Initiales

**Limitation :**
- Le premier snapshot quotidien sera généré le lendemain du déploiement
- Les performances commerciales mensuelles seront calculées le 1er du mois suivant

**Mitigation :**
- Exécuter manuellement les calculs initiaux si nécessaire :
```java
// Via un endpoint admin ou un script
biScheduler.generateDailySnapshot();
commercialPerformanceService.calculateCurrentMonthPerformances();
```

---

## 🔄 Plan de Rollback

En cas de problème critique :

### 1. Rollback de l'Application
```bash
# Redéployer la version précédente
# Les nouvelles colonnes/tables n'affecteront pas l'ancienne version
```

### 2. Rollback de la Base de Données (Si nécessaire)
```sql
-- Supprimer les nouvelles tables
DROP TABLE IF EXISTS credit_payment_event CASCADE;
DROP TABLE IF EXISTS stock_movement CASCADE;
DROP TABLE IF EXISTS commercial_performance CASCADE;
DROP TABLE IF EXISTS daily_business_snapshot CASCADE;

-- Supprimer les nouvelles colonnes de credit
ALTER TABLE credit 
  DROP COLUMN IF EXISTS profit_margin,
  DROP COLUMN IF EXISTS profit_margin_percentage,
  DROP COLUMN IF EXISTS payment_completion_rate,
  DROP COLUMN IF EXISTS expected_duration_days,
  DROP COLUMN IF EXISTS actual_duration_days,
  DROP COLUMN IF EXISTS payment_regularity_score,
  DROP COLUMN IF EXISTS risk_level,
  DROP COLUMN IF EXISTS season_period,
  DROP COLUMN IF EXISTS distribution_zone,
  DROP COLUMN IF EXISTS customer_segment;

-- Supprimer les nouvelles colonnes de articles
ALTER TABLE articles
  DROP COLUMN IF EXISTS reorder_point,
  DROP COLUMN IF EXISTS optimal_stock_level,
  DROP COLUMN IF EXISTS average_monthly_sales,
  DROP COLUMN IF EXISTS stock_turnover_rate,
  DROP COLUMN IF EXISTS days_of_stock_available,
  DROP COLUMN IF EXISTS last_restock_date,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS is_seasonal;
```

### 3. Restauration depuis Backup (Dernier recours)
```bash
# Restaurer le backup
psql -h localhost -U postgres -d elykia_db < backup_avant_bi_YYYYMMDD.sql
```

---

## 📞 Support et Escalade

### Problèmes Courants

**1. Migration SQL trop longue**
- Solution : Exécuter par lots avec LIMIT
- Ou : Accepter que certains anciens crédits n'aient pas les métriques

**2. Erreurs au démarrage de l'application**
- Vérifier les logs : `grep -i error logs/application.log`
- Vérifier que toutes les tables/colonnes sont créées
- Rollback si nécessaire

**3. Endpoints BI retournent des erreurs**
- Vérifier que les services BI sont bien injectés
- Vérifier les permissions (ADMIN/MANAGER)
- Vérifier les logs pour les NullPointerException

**4. Performances dégradées**
- Vérifier les index : `SELECT * FROM pg_indexes WHERE tablename = 'credit'`
- Analyser les requêtes lentes
- Envisager les vues matérialisées (voir TODO_OPTIMIZATIONS.md)

---

## ✅ Critères de Succès

La migration est réussie si :

- [ ] Toutes les tables sont créées
- [ ] Toutes les colonnes sont ajoutées
- [ ] Les données existantes sont mises à jour
- [ ] L'application démarre sans erreur
- [ ] Les endpoints BI répondent correctement
- [ ] Les processus existants fonctionnent normalement
- [ ] Aucune dégradation de performance
- [ ] Le scheduler fonctionne (vérifier le lendemain)

---

**Date :** 18 novembre 2025  
**Version :** 1.0.0  
**Statut :** Plan de Migration Prêt
