# BI Dashboard - Roadmap d'Enrichissement

## 📋 Statut : PLANIFIÉ - Phase 2

**Date de création :** 15 janvier 2026  
**Priorité :** MOYENNE (après résolution OutOfMemory)  
**Effort estimé :** 3-4 semaines  

---

## 🎯 Objectif

Enrichir le Dashboard BI existant avec les métriques issues du **Rapport Journalier** et ajouter de nouveaux modules d'analyse pour une vision complète de l'activité commerciale.

---

## 📊 Analyse des Gaps

### Métriques Actuellement Disponibles (Rapport Journalier)

Le système de rapport journalier (`DailyCommercialReport`, `DailyOperationLog`, `CashDeposit`) capture déjà :

✅ **Trésorerie :**
- Montant à verser par commercial
- Montant versé
- Reste à verser
- Historique des versements avec billetage

✅ **Ventes Cash :**
- Distinction ventes cash vs crédit
- Traçabilité complète dans DailyOperationLog

✅ **Activité Tontine :**
- Adhésions
- Collectes
- Livraisons
- Recouvrements Tontine

✅ **Commandes :**
- Suivi des commandes par commercial

✅ **Audit :**
- Journal complet des opérations
- Traçabilité immuable

### Métriques Manquantes dans le BI Dashboard

❌ **Aucune analyse de trésorerie**  
❌ **Pas de distinction Cash vs Crédit**  
❌ **Module Tontine inexistant**  
❌ **Pas de suivi des commandes**  
❌ **Pas d'analyse d'audit/activité**  

---

## 🚀 Modules à Développer

### Module 1 : Trésorerie et Versements 🏦

**Priorité :** HAUTE  
**Effort :** 1 semaine  
**Impact Business :** Critique pour la gestion de trésorerie

#### KPIs à Implémenter

**Vue d'ensemble :**
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Total À Verser       │ Total Versé          │ Total Reste          │ Taux de Versement    │
│ 5,200,000 FCFA       │ 4,100,000 FCFA       │ 1,100,000 FCFA       │ 78.8%                │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Versements Jour      │ Versements Semaine   │ Délai Moyen          │ Versements en Retard │
│ 8 (850,000 F)        │ 42 (3,200,000 F)     │ 1.8 jours            │ 3 (280,000 F)        │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Métriques Détaillées :**
- Espèces en circulation par commercial
- Taux de versement par commercial (Versé / À Verser)
- Délai moyen de versement (Date encaissement → Date versement)
- Versements en retard (> 3 jours)
- Évolution des versements dans le temps
- Analyse des écarts (théorique vs réel)
- Distribution des billetages
- Commerciaux avec le plus d'espèces non versées

**Graphiques :**
- Ligne : Évolution quotidienne des versements
- Barres empilées : À Verser vs Versé par commercial
- Jauge : Taux de versement global
- Heatmap : Versements par jour de la semaine
- Top 10 : Commerciaux avec reste à verser le plus élevé

**Alertes :**
- ⚠️ Commercial avec > 500,000 FCFA non versés
- ⚠️ Versement en retard > 3 jours
- 🔴 Versement en retard > 7 jours (critique)

**Endpoints API :**
```java
GET /api/v1/bi/treasury/overview
GET /api/v1/bi/treasury/by-commercial
GET /api/v1/bi/treasury/deposits-history
GET /api/v1/bi/treasury/late-deposits
GET /api/v1/bi/treasury/cash-in-circulation
```

---

### Module 2 : Analyse Cash vs Crédit 💵

**Priorité :** HAUTE  
**Effort :** 3 jours  
**Impact Business :** Insight stratégique sur les préférences de paiement

#### KPIs à Implémenter

**Vue d'ensemble :**
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ CA Total             │ CA Cash              │ CA Crédit            │ Ratio Cash/Crédit    │
│ 12,500,000 FCFA      │ 3,200,000 FCFA       │ 9,300,000 FCFA       │ 25.6% / 74.4%        │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Ventes Cash          │ Ventes Crédit        │ Panier Moyen Cash    │ Panier Moyen Crédit  │
│ 45 ventes            │ 156 ventes           │ 71,111 FCFA          │ 59,615 FCFA          │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Métriques Détaillées :**
- Répartition CA Cash vs Crédit (montant et %)
- Nombre de ventes Cash vs Crédit
- Panier moyen Cash vs Crédit
- Évolution du ratio Cash/Crédit dans le temps
- Ratio Cash/Crédit par commercial
- Ratio Cash/Crédit par article
- Tendances de paiement (préférence cash ou crédit)
- Marge Cash vs Marge Crédit

**Graphiques :**
- Donut : Répartition CA Cash vs Crédit
- Ligne double : Évolution CA Cash et Crédit
- Barres groupées : Cash vs Crédit par commercial
- Scatter : Panier moyen Cash vs Crédit par article
- Tendance : Évolution du ratio Cash/Crédit

**Insights :**
- Articles préférés en cash
- Articles préférés à crédit
- Commerciaux avec le plus de ventes cash
- Périodes avec plus de ventes cash

**Endpoints API :**
```java
GET /api/v1/bi/sales/cash-vs-credit
GET /api/v1/bi/sales/cash-trends
GET /api/v1/bi/sales/payment-preferences
GET /api/v1/bi/sales/cash-by-commercial
GET /api/v1/bi/sales/cash-by-article
```

---

### Module 3 : Analyse Tontine 🤝

**Priorité :** MOYENNE  
**Effort :** 1 semaine  
**Impact Business :** Nouveau canal de revenus à optimiser

#### KPIs à Implémenter

**Vue d'ensemble :**
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Adhésions Actives    │ Collectes Mois       │ Livraisons Mois      │ Taux de Livraison    │
│ 245                  │ 1,850 (8,200,000 F)  │ 1,720 (7,650,000 F)  │ 93.0%                │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Nouvelles Adhésions  │ Collecte Moyenne     │ Taux de Collecte     │ Taux de Rétention    │
│ 18 ce mois           │ 4,432 FCFA           │ 95.2%                │ 87.5%                │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Métriques Détaillées :**
- Nombre d'adhésions actives
- Nouvelles adhésions par période
- Taux de croissance des adhésions
- Montant total collecté
- Montant moyen par collecte
- Taux de collecte (Collectes réussies / Collectes prévues)
- Montant total livré
- Taux de livraison (Livraisons / Collectes)
- Délai moyen entre collecte et livraison
- Taux de rétention (Adhésions actives / Total adhésions)
- Performance Tontine par commercial
- Recouvrements Tontine

**Graphiques :**
- Ligne : Évolution des adhésions
- Barres : Collectes vs Livraisons par mois
- Jauge : Taux de collecte
- Funnel : Adhésions → Collectes → Livraisons
- Top 10 : Commerciaux avec le plus d'adhésions

**Analyse de Cohorte :**
- Rétention par mois d'adhésion
- Valeur vie client Tontine
- Taux de désabonnement

**Endpoints API :**
```java
GET /api/v1/bi/tontine/overview
GET /api/v1/bi/tontine/adhesions-trends
GET /api/v1/bi/tontine/collections-analysis
GET /api/v1/bi/tontine/deliveries-analysis
GET /api/v1/bi/tontine/by-commercial
GET /api/v1/bi/tontine/retention-analysis
```

---

### Module 4 : Suivi des Commandes 📦

**Priorité :** BASSE  
**Effort :** 2 jours  
**Impact Business :** Optimisation du processus de commande

#### KPIs à Implémenter

**Vue d'ensemble :**
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Commandes en Cours   │ Valeur Commandes     │ Commandes Livrées    │ Taux de Conversion   │
│ 28                   │ 2,100,000 FCFA       │ 156 ce mois          │ 84.8%                │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Délai Moyen          │ Commandes en Retard  │ Valeur Moyenne       │ Articles Commandés   │
│ 3.2 jours            │ 5 (18%)              │ 75,000 FCFA          │ 12 types             │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Métriques Détaillées :**
- Nombre de commandes en cours
- Valeur totale des commandes
- Commandes livrées par période
- Taux de conversion (Commandes → Ventes)
- Délai moyen de traitement
- Commandes en retard
- Valeur moyenne par commande
- Articles les plus commandés
- Commandes par commercial
- Évolution des commandes

**Endpoints API :**
```java
GET /api/v1/bi/orders/overview
GET /api/v1/bi/orders/in-progress
GET /api/v1/bi/orders/conversion-rate
GET /api/v1/bi/orders/by-commercial
GET /api/v1/bi/orders/popular-items
```

---

### Module 5 : Audit et Activité 📝

**Priorité :** BASSE  
**Effort :** 3 jours  
**Impact Business :** Détection d'anomalies et optimisation opérationnelle

#### KPIs à Implémenter

**Vue d'ensemble :**
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Opérations Jour      │ Opérations Semaine   │ Type le Plus Fréquent│ Commercial le + Actif│
│ 342                  │ 2,156                │ Recouvrement (45%)   │ Jean K. (156 ops)    │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

**Métriques Détaillées :**
- Volume d'opérations par type
- Activité par heure de la journée
- Activité par jour de la semaine
- Commerciaux les plus actifs
- Types d'opérations les plus fréquents
- Durée moyenne par type d'opération
- Anomalies détectées (ex: retours excessifs)
- Taux d'erreur par type d'opération

**Graphiques :**
- Heatmap : Activité par heure et jour
- Barres : Opérations par type
- Timeline : Activité en temps réel
- Pareto : 80% des opérations par 20% des commerciaux

**Endpoints API :**
```java
GET /api/v1/bi/audit/operations-volume
GET /api/v1/bi/audit/activity-heatmap
GET /api/v1/bi/audit/by-type
GET /api/v1/bi/audit/anomalies
GET /api/v1/bi/audit/most-active-users
```

---

### Module 6 : Acquisition et Nouveaux Clients 👥

**Priorité :** MOYENNE  
**Effort :** 2 jours  
**Impact Business :** Optimisation de la stratégie d'acquisition

#### KPIs à Implémenter

**Métriques Détaillées :**
- Nouveaux clients par période
- Taux d'acquisition par commercial
- Valeur moyenne du premier crédit
- Solde moyen des nouveaux comptes
- Taux de conversion (Nouveaux → Actifs)
- Taux de rétention des nouveaux clients
- Segmentation des nouveaux clients
- Coût d'acquisition client (si disponible)
- Délai moyen première vente → deuxième vente

**Endpoints API :**
```java
GET /api/v1/bi/customers/new-acquisitions
GET /api/v1/bi/customers/acquisition-rate
GET /api/v1/bi/customers/first-purchase-analysis
GET /api/v1/bi/customers/retention-new-clients
```

---

## 🗄️ Modifications de Base de Données

### Nouvelles Tables d'Agrégation

#### 1. treasury_analytics_daily
```sql
CREATE TABLE treasury_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    collector VARCHAR(255),
    amount_to_deposit DOUBLE PRECISION NOT NULL DEFAULT 0,
    amount_deposited DOUBLE PRECISION NOT NULL DEFAULT 0,
    amount_remaining DOUBLE PRECISION NOT NULL DEFAULT 0,
    deposit_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    deposits_count INTEGER NOT NULL DEFAULT 0,
    avg_delay_days DOUBLE PRECISION,
    late_deposits_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, collector)
);

CREATE INDEX idx_treasury_date ON treasury_analytics_daily(date);
CREATE INDEX idx_treasury_collector ON treasury_analytics_daily(collector);
```

#### 2. cash_credit_analytics_daily
```sql
CREATE TABLE cash_credit_analytics_daily (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    collector VARCHAR(255),
    cash_sales_count INTEGER NOT NULL DEFAULT 0,
    cash_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    credit_sales_count INTEGER NOT NULL DEFAULT 0,
    credit_sales_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    cash_ratio DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_cash_basket DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_credit_basket DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, collector)
);

CREATE INDEX idx_cash_credit_date ON cash_credit_analytics_daily(date);
```

#### 3. tontine_analytics_monthly
```sql
CREATE TABLE tontine_analytics_monthly (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    collector VARCHAR(255),
    active_adhesions INTEGER NOT NULL DEFAULT 0,
    new_adhesions INTEGER NOT NULL DEFAULT 0,
    collections_count INTEGER NOT NULL DEFAULT 0,
    collections_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    deliveries_count INTEGER NOT NULL DEFAULT 0,
    deliveries_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    collection_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    delivery_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_collection_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    retention_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month, collector)
);

CREATE INDEX idx_tontine_period ON tontine_analytics_monthly(year, month);
```

---

## 📅 Planning de Développement

### Phase 2.1 : Trésorerie (Semaine 1)
- Création table treasury_analytics_daily
- Implémentation BiTreasuryService
- Endpoints API trésorerie
- Tests unitaires et intégration

### Phase 2.2 : Cash vs Crédit (Semaine 2)
- Création table cash_credit_analytics_daily
- Enrichissement BiSalesAnalyticsService
- Endpoints API cash/crédit
- Tests

### Phase 2.3 : Tontine (Semaine 3)
- Création table tontine_analytics_monthly
- Implémentation BiTontineService
- Endpoints API Tontine
- Tests

### Phase 2.4 : Commandes + Audit + Nouveaux Clients (Semaine 4)
- Implémentation modules restants
- Tests d'intégration globaux
- Documentation API
- Déploiement

---

## 🎯 Prérequis

Avant de démarrer cette phase :
- ✅ Résolution du problème OutOfMemoryException (Phase 1)
- ✅ Optimisation des requêtes BI existantes
- ✅ Tables d'agrégation en place et fonctionnelles
- ✅ Performance validée en production

---

## 📊 Métriques de Succès

- Tous les KPIs du rapport journalier disponibles dans le BI Dashboard
- Temps de réponse < 1 seconde pour tous les nouveaux endpoints
- Couverture de tests > 80%
- Documentation API complète
- Adoption par les managers > 70%

---

## 📝 Notes

- Cette roadmap est basée sur l'analyse du rapport journalier existant
- Les données sont déjà capturées dans `DailyCommercialReport`, `DailyOperationLog`, et `CashDeposit`
- L'effort principal est de créer les agrégations et les endpoints BI
- Réutiliser au maximum les patterns de la Phase 1 (optimisation)

---

**Version :** 1.0  
**Date :** 15 janvier 2026  
**Statut :** 📋 Planifié  
**Dépendances :** Phase 1 (bi-performance-optimization) complétée
