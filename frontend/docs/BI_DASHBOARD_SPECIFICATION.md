# Spécification Dashboard BI - Système de Vente à Crédit et Gestion de Stock

## 1. CONTEXTE ET OBJECTIFS

### 1.1 Vue d'ensemble
Le système gère deux flux principaux :
- **Ventes aux commerciaux (PROMOTER)** : Sorties de stock vers les distributeurs
- **Ventes aux clients finaux (CLIENT)** : Ventes à crédit distribuées par les commerciaux

### 1.2 Objectifs du Dashboard BI
- Suivi en temps réel des performances commerciales et financières
- Analyse de la rentabilité par période, commercial et article
- Monitoring des stocks et prévisions
- Détection des tendances et anomalies
- Aide à la décision stratégique

---

## 2. DONNÉES ACTUELLES - ANALYSE

### 2.1 Entités principales existantes

#### Credit (Ventes)
- `totalAmount` : Montant total de vente (prix crédit)
- `totalPurchase` : Coût d'achat total
- `totalAmountPaid` : Montant déjà payé
- `totalAmountRemaining` : Reste à payer
- `advance` : Avance versée
- `dailyStake` : Mise journalière
- `collector` : Commercial responsable
- `clientType` : PROMOTER ou CLIENT
- `status` : CREATED, VALIDATED, INPROGRESS, SETTLED
- `solvencyNote` : EARLY, TIME, LATE, ND
- `lateDaysCount` : Jours de retard
- `beginDate`, `expectedEndDate`, `effectiveEndDate`
- `accountingDate`, `releaseDate`

#### Articles (Produits)
- `purchasePrice` : Prix d'achat
- `sellingPrice` : Prix de vente comptant
- `creditSalePrice` : Prix de vente à crédit
- `stockQuantity` : Quantité en stock
- `name`, `marque`, `model`, `type` : Identification produit

#### CreditArticles (Lignes de vente)
- `quantity` : Quantité vendue
- `unitPrice` : Prix unitaire appliqué

---

## 3. NOUVELLES DONNÉES À CAPTURER

### 3.1 Enrichissement de l'entité Credit

```java
// Champs à ajouter dans Credit
@Column(name = "profit_margin")
private Double profitMargin; // Marge bénéficiaire = totalAmount - totalPurchase

@Column(name = "profit_margin_percentage")
private Double profitMarginPercentage; // (profitMargin / totalPurchase) * 100

@Column(name = "payment_completion_rate")
private Double paymentCompletionRate; // (totalAmountPaid / totalAmount) * 100

@Column(name = "expected_duration_days")
private Integer expectedDurationDays; // Durée prévue en jours

@Column(name = "actual_duration_days")
private Integer actualDurationDays; // Durée réelle si terminé

@Column(name = "payment_regularity_score")
private Double paymentRegularityScore; // Score de régularité des paiements (0-100)

@Column(name = "risk_level")
@Enumerated(EnumType.STRING)
private RiskLevel riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

@Column(name = "season_period")
private String seasonPeriod; // Q1, Q2, Q3, Q4 ou mois

@Column(name = "distribution_zone")
private String distributionZone; // Zone géographique du commercial

@Column(name = "customer_segment")
private String customerSegment; // Segmentation client (nouveau, fidèle, VIP, etc.)
```

### 3.2 Nouvelle entité : CreditPaymentEvent

```java
@Entity
public class CreditPaymentEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    private Credit credit;
    
    private LocalDateTime paymentDate;
    private Double amount;
    private Integer daysFromLastPayment;
    private Boolean isOnTime; // Paiement dans les délais
    private String paymentMethod; // CASH, MOBILE_MONEY, etc.
}
```

### 3.3 Enrichissement de l'entité Articles

```java
// Champs à ajouter dans Articles
@Column(name = "reorder_point")
private Integer reorderPoint; // Seuil de réapprovisionnement

@Column(name = "optimal_stock_level")
private Integer optimalStockLevel; // Niveau de stock optimal

@Column(name = "average_monthly_sales")
private Double averageMonthlySales; // Ventes moyennes mensuelles

@Column(name = "stock_turnover_rate")
private Double stockTurnoverRate; // Taux de rotation du stock

@Column(name = "days_of_stock_available")
private Integer daysOfStockAvailable; // Jours de stock disponible

@Column(name = "last_restock_date")
private LocalDate lastRestockDate;

@Column(name = "category")
private String category; // Catégorie produit pour analyse

@Column(name = "is_seasonal")
private Boolean isSeasonal; // Produit saisonnier
```

### 3.4 Nouvelle entité : StockMovement (Traçabilité complète)

```java
@Entity
public class StockMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    private Articles article;
    
    @Enumerated(EnumType.STRING)
    private MovementType type; // ENTRY, RELEASE, RETURN, ADJUSTMENT, LOSS
    
    private Integer quantity;
    private Integer stockBefore;
    private Integer stockAfter;
    private LocalDateTime movementDate;
    private String reason;
    private String performedBy;
    
    @ManyToOne
    private Credit relatedCredit; // Si lié à une vente
    
    private Double unitCost; // Coût unitaire au moment du mouvement
}
```

### 3.5 Nouvelle entité : CommercialPerformance (Agrégation)

```java
@Entity
public class CommercialPerformance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String collector;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    
    // Métriques de vente
    private Integer totalSalesCount;
    private Double totalSalesAmount;
    private Double totalProfit;
    private Double averageSaleAmount;
    
    // Métriques de recouvrement
    private Double totalCollected;
    private Double collectionRate; // %
    private Integer onTimePaymentsCount;
    private Integer latePaymentsCount;
    
    // Métriques de distribution
    private Integer activeClientsCount;
    private Integer newClientsCount;
    private Double clientRetentionRate;
    
    // Métriques de risque
    private Double portfolioAtRisk; // Montant en retard
    private Integer criticalAccountsCount;
}
```

### 3.6 Nouvelle entité : DailyBusinessSnapshot

```java
@Entity
public class DailyBusinessSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private LocalDate snapshotDate;
    
    // Ventes
    private Integer newCreditsCount;
    private Double newCreditsTotalAmount;
    private Double newCreditsProfit;
    
    // Collections
    private Double dailyCollections;
    private Integer paymentsReceivedCount;
    
    // Stock
    private Double totalStockValue;
    private Integer lowStockItemsCount;
    private Integer outOfStockItemsCount;
    
    // Portefeuille
    private Double totalOutstandingAmount;
    private Double totalOverdueAmount;
    private Integer activeCreditsCount;
    
    // Trésorerie
    private Double cashInHand;
    private Double expectedDailyCollection;
}
```

---

## 4. INDICATEURS CLÉS DE PERFORMANCE (KPI)

### 4.1 KPI Ventes et Rentabilité

#### Indicateurs Globaux
1. **Chiffre d'affaires (CA)**
   - CA total période
   - CA par type de client (PROMOTER vs CLIENT)
   - CA par commercial
   - CA par article/catégorie
   - Évolution CA (%, tendance)

2. **Marge et Rentabilité**
   - Marge brute totale = Σ(totalAmount - totalPurchase)
   - Taux de marge moyen = (Marge brute / CA) × 100
   - Marge par commercial
   - Marge par article
   - ROI par article = (Marge / Prix d'achat) × 100

3. **Volume et Fréquence**
   - Nombre de ventes
   - Panier moyen = CA / Nombre de ventes
   - Quantité moyenne par vente
   - Taux de conversion (prospects → ventes)

#### Indicateurs par Commercial
4. **Performance Commerciale**
   - Top 10 commerciaux (CA, marge, volume)
   - CA par commercial avec évolution
   - Nombre de clients actifs par commercial
   - Taux d'acquisition de nouveaux clients
   - Panier moyen par commercial

5. **Efficacité Distribution**
   - Ratio PROMOTER/CLIENT par commercial
   - Taux de pénétration géographique
   - Vitesse de distribution (jours entre sortie et distribution)

### 4.2 KPI Recouvrement et Trésorerie

6. **Taux de Recouvrement**
   - Taux de recouvrement global = (Total payé / Total à payer) × 100
   - Taux de recouvrement par commercial
   - Montant collecté vs attendu (jour/semaine/mois)
   - Évolution des encaissements

7. **Délais et Ponctualité**
   - Délai moyen de paiement
   - % paiements à temps
   - % paiements en retard
   - Retard moyen (jours)
   - Distribution des retards (0-7j, 8-15j, 16-30j, >30j)

8. **Portefeuille à Risque**
   - Montant total en retard
   - Portfolio at Risk (PAR) 7/15/30 jours
   - Taux de créances douteuses
   - Provision pour créances irrécouvrables
   - Créances par niveau de risque

9. **Solvabilité Clients**
   - Distribution par solvencyNote (EARLY, TIME, LATE)
   - Score moyen de régularité
   - Taux de clients "bons payeurs"
   - Taux de défaut

### 4.3 KPI Stock et Inventaire

10. **Valeur et Composition**
    - Valeur totale du stock = Σ(stockQuantity × purchasePrice)
    - Valeur par catégorie
    - % de la valeur par article (Pareto)
    - Stock dormant (articles sans mouvement >90j)

11. **Rotation et Performance**
    - Taux de rotation global = Ventes / Stock moyen
    - Taux de rotation par article
    - Durée moyenne de stockage
    - Jours de stock disponible
    - Couverture stock (jours)

12. **Disponibilité et Ruptures**
    - Taux de disponibilité = (Articles en stock / Total articles) × 100
    - Nombre de ruptures de stock
    - Coût des ruptures (ventes perdues)
    - Articles sous seuil critique
    - Taux de service

13. **Mouvements et Flux**
    - Entrées de stock (quantité, valeur)
    - Sorties de stock (quantité, valeur)
    - Retours (quantité, valeur, %)
    - Pertes et ajustements
    - Vélocité par article

### 4.4 KPI Opérationnels

14. **Cycle de Vente**
    - Durée moyenne de crédit
    - Taux de clôture anticipée
    - Taux de prolongation
    - Délai moyen validation → démarrage

15. **Productivité**
    - Ventes par commercial par jour
    - Montant collecté par commercial par jour
    - Nombre de visites/contacts par vente
    - Coût d'acquisition client

### 4.5 KPI Prédictifs et Analytiques

16. **Prévisions**
    - Prévision CA prochain mois (tendance)
    - Prévision encaissements J+7, J+15, J+30
    - Prévision besoins réapprovisionnement
    - Saisonnalité des ventes

17. **Analyse de Tendance**
    - Croissance CA (MoM, YoY)
    - Évolution marge
    - Tendance recouvrement
    - Tendance rotation stock

---

## 5. STRUCTURE DU DASHBOARD BI

### 5.1 Vue d'ensemble (Homepage)

**Période sélectionnée** : [Aujourd'hui] [Cette semaine] [Ce mois] [Cette année] [Personnalisé]

#### Cartes KPI Principales (4 grandes cartes)
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  CHIFFRE D'AFFAIRES │  │   MARGE BRUTE       │  │  ENCAISSEMENTS      │  │  STOCK TOTAL        │
│                     │  │                     │  │                     │  │                     │
│   12,500,000 FCFA   │  │   3,750,000 FCFA    │  │   8,200,000 FCFA    │  │   15,000,000 FCFA   │
│   ↑ +15.3%          │  │   30% (↑ +2.1%)     │  │   65.6% (↓ -3.2%)   │  │   ↓ -5.8%           │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

#### Graphiques Principaux
1. **Évolution CA et Marge** (Ligne double, 12 derniers mois)
2. **Répartition CA par Type Client** (Donut : PROMOTER vs CLIENT)
3. **Top 10 Commerciaux** (Barre horizontale : CA + Marge)
4. **Taux de Recouvrement** (Jauge : % collecté vs attendu)

#### Alertes et Notifications
```
⚠️ 5 articles en rupture de stock
⚠️ 12 crédits en retard > 15 jours (450,000 FCFA)
✓ 3 commerciaux ont dépassé leur objectif mensuel
ℹ️ Stock faible sur 8 articles (réapprovisionnement recommandé)
```

---

### 5.2 Module Ventes

#### Filtres
- Période : [Rapide] [Personnalisé]
- Commercial : [Tous] [Sélection multiple]
- Type client : [Tous] [PROMOTER] [CLIENT]
- Statut : [Tous] [CREATED] [VALIDATED] [INPROGRESS] [SETTLED]
- Zone géographique : [Toutes] [Sélection]

#### Section 1 : Métriques Globales
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Nombre de ventes │  CA Total        │  Marge Totale    │  Panier Moyen    │
│      156         │  12,500,000 F    │  3,750,000 F     │  80,128 F        │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

#### Section 2 : Analyse Temporelle
- **Graphique en ligne** : CA journalier/hebdomadaire/mensuel
- **Heatmap** : Ventes par jour de la semaine et heure
- **Graphique en barres** : Comparaison période actuelle vs période précédente

#### Section 3 : Analyse par Commercial
- **Tableau détaillé** :
  ```
  Commercial | Nb Ventes | CA | Marge | Taux Marge | Panier Moyen | Clients Actifs | Évolution
  -----------|-----------|----|----|------------|--------------|----------------|----------
  Jean K.    | 45        | 3.2M | 980K | 30.6% | 71,111 F | 38 | ↑ +12%
  Marie D.   | 38        | 2.8M | 850K | 30.4% | 73,684 F | 32 | ↑ +8%
  ...
  ```
- **Graphique radar** : Performance multi-critères par commercial

#### Section 4 : Analyse par Article
- **Top 10 articles** (CA, quantité, marge)
- **Analyse ABC** (Pareto : 80% du CA)
- **Matrice BCG** : Croissance vs Part de marché
- **Tableau détaillé** :
  ```
  Article | Qté Vendue | CA | Marge Unit. | Marge Totale | Rotation | Contribution CA
  --------|------------|----|----|-------------|----------|----------------
  iPhone 13 | 45 | 2.5M | 25,000 F | 1,125,000 F | 8.2 | 20%
  ...
  ```

#### Section 5 : Analyse de Rentabilité
- **Graphique cascade** : Décomposition de la marge
- **Scatter plot** : Volume vs Marge par article
- **Évolution taux de marge** dans le temps

---

### 5.3 Module Recouvrement

#### Filtres
- Période : [Rapide] [Personnalisé]
- Commercial : [Tous] [Sélection]
- Statut solvabilité : [Tous] [EARLY] [TIME] [LATE] [ND]
- Niveau de risque : [Tous] [LOW] [MEDIUM] [HIGH] [CRITICAL]

#### Section 1 : Tableau de Bord Recouvrement
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Attendu Période      │ Collecté             │ Taux Recouvrement    │ Reste à Collecter    │
│ 10,000,000 F         │ 6,560,000 F          │ 65.6%                │ 3,440,000 F          │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Paiements à Temps    │ Paiements en Retard  │ Retard Moyen         │ PAR 30 jours         │
│ 89 (72%)             │ 35 (28%)             │ 8.5 jours            │ 1,250,000 F (12.5%)  │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

#### Section 2 : Analyse des Encaissements
- **Graphique en ligne** : Encaissements journaliers vs Attendu
- **Graphique en barres empilées** : Encaissements par commercial
- **Graphique en aires** : Cumul encaissements vs Objectif mensuel

#### Section 3 : Analyse des Retards
- **Distribution des retards** (Histogramme)
  ```
  0-7 jours    : ████████████████ 45 crédits
  8-15 jours   : ██████████ 28 crédits
  16-30 jours  : █████ 12 crédits
  > 30 jours   : ██ 5 crédits
  ```
- **Évolution du PAR** (Portfolio at Risk) dans le temps
- **Top 10 crédits en retard** (Montant, jours de retard, commercial)

#### Section 4 : Analyse de Solvabilité
- **Répartition par solvencyNote** (Donut)
  ```
  EARLY : 35% (Payeurs anticipés)
  TIME  : 48% (Payeurs ponctuels)
  LATE  : 15% (Payeurs en retard)
  ND    : 2%  (Non déterminé)
  ```
- **Score de régularité moyen** par commercial
- **Matrice de risque** : Montant vs Jours de retard

#### Section 5 : Prévisions de Trésorerie
- **Graphique en ligne** : Prévision encaissements 30 prochains jours
- **Tableau** : Encaissements attendus par semaine
- **Scénarios** : Optimiste / Réaliste / Pessimiste

#### Section 6 : Performance par Commercial
```
Commercial | Portefeuille | Collecté | Taux | En Retard | PAR 30 | Score Qualité
-----------|--------------|----------|------|-----------|--------|---------------
Jean K.    | 2,500,000 F  | 1,850,000| 74%  | 280,000 F | 11.2%  | 8.5/10
Marie D.   | 2,100,000 F  | 1,680,000| 80%  | 150,000 F | 7.1%   | 9.2/10
...
```

---

### 5.4 Module Stock

#### Filtres
- Catégorie : [Toutes] [Sélection]
- Statut : [Tous] [En stock] [Stock faible] [Rupture]
- Type : [Tous] [Saisonnier] [Permanent]

#### Section 1 : Vue d'ensemble Stock
```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Valeur Totale Stock  │ Nb Articles          │ Taux Rotation Moyen  │ Couverture Moyenne   │
│ 15,000,000 F         │ 245                  │ 6.8                  │ 45 jours             │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ Articles Disponibles │ Stock Faible         │ Ruptures             │ Stock Dormant        │
│ 198 (80.8%)          │ 32 (13.1%)           │ 15 (6.1%)            │ 8 (3.3%)             │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

#### Section 2 : Analyse de Valeur
- **Graphique Pareto** : 20% articles = 80% valeur
- **Répartition par catégorie** (Treemap)
- **Évolution valeur stock** dans le temps

#### Section 3 : Analyse de Rotation
- **Tableau détaillé** :
  ```
  Article | Stock | Valeur | Ventes 30j | Rotation | Couverture | Statut
  --------|-------|--------|------------|----------|------------|--------
  iPhone 13 | 12 | 850K | 45 | 8.2 | 8 jours | ✓ OK
  Samsung A54 | 3 | 180K | 28 | 12.5 | 3 jours | ⚠️ Faible
  Tecno Spark | 0 | 0 | 15 | - | 0 jours | ❌ Rupture
  ...
  ```
- **Graphique scatter** : Rotation vs Valeur
- **Heatmap** : Rotation par catégorie et période

#### Section 4 : Mouvements de Stock
- **Graphique en barres** : Entrées vs Sorties par période
- **Graphique en ligne** : Évolution stock par article (top 10)
- **Tableau mouvements récents** :
  ```
  Date | Article | Type | Quantité | Stock Avant | Stock Après | Raison
  -----|---------|------|----------|-------------|-------------|--------
  18/11 | iPhone 13 | RELEASE | -5 | 17 | 12 | Vente #CR-1234
  17/11 | Samsung A54 | ENTRY | +20 | 8 | 28 | Réappro
  ...
  ```

#### Section 5 : Alertes et Recommandations
- **Articles à réapprovisionner** (sous seuil)
  ```
  Article | Stock Actuel | Seuil | Ventes Moy/Mois | Qté Recommandée | Urgence
  --------|--------------|-------|-----------------|-----------------|--------
  Samsung A54 | 3 | 10 | 28 | 30 | 🔴 Urgent
  Tecno Spark | 0 | 5 | 15 | 20 | 🔴 Critique
  ...
  ```
- **Stock dormant** (>90 jours sans mouvement)
- **Prévision ruptures** (7 prochains jours)

#### Section 6 : Analyse de Performance
- **Top 10 articles** (rotation, CA, marge)
- **Flop 10 articles** (rotation faible, stock dormant)
- **Analyse saisonnalité** par article

---

### 5.5 Module Analyse Commerciale Avancée

#### Section 1 : Analyse de Cohorte
- **Rétention clients** par mois d'acquisition
- **Valeur vie client (LTV)** par cohorte
- **Taux de réachat** par période

#### Section 2 : Segmentation Clients
- **RFM Analysis** (Récence, Fréquence, Montant)
  ```
  Segment | Nb Clients | CA Moyen | Fréquence | Dernière Vente | Action
  --------|------------|----------|-----------|----------------|--------
  Champions | 45 | 250K | 8.5 | < 7j | Fidéliser
  Fidèles | 78 | 180K | 5.2 | < 15j | Récompenser
  À Risque | 32 | 150K | 2.1 | > 60j | Réactiver
  Perdus | 18 | 120K | 1.2 | > 180j | Reconquérir
  ```
- **Distribution géographique** des ventes
- **Analyse comportementale** par segment

#### Section 3 : Analyse Prédictive
- **Prévision CA** (3 prochains mois)
- **Prévision demande** par article
- **Identification clients à risque** (probabilité défaut)
- **Opportunités de cross-sell/up-sell**

#### Section 4 : Analyse Comparative
- **Comparaison périodes** (MoM, YoY)
- **Benchmarking commerciaux**
- **Analyse écarts** (Réalisé vs Objectif)

---

### 5.6 Module Rapports Exécutifs

#### Rapport Journalier
```
📊 RAPPORT JOURNALIER - 18/11/2025

VENTES
• Nouvelles ventes : 8 (650,000 FCFA)
• Marge générée : 195,000 FCFA (30%)

ENCAISSEMENTS
• Collecté : 420,000 FCFA
• Attendu : 450,000 FCFA
• Taux : 93.3% ✓

STOCK
• Valeur : 15,000,000 FCFA
• Alertes : 2 articles en rupture

ALERTES
⚠️ 3 crédits en retard aujourd'hui (85,000 FCFA)
✓ Objectif journalier atteint à 105%
```

#### Rapport Hebdomadaire
- Synthèse des performances
- Top/Flop commerciaux
- Évolution KPI clés
- Actions recommandées

#### Rapport Mensuel
- Analyse complète des performances
- Comparaison vs mois précédent
- Analyse des tendances
- Recommandations stratégiques
- Prévisions mois suivant

---

## 6. SPÉCIFICATIONS TECHNIQUES

### 6.1 Architecture Proposée

```
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE PRÉSENTATION                       │
│  (Frontend Dashboard - React/Angular/Vue + Chart.js/D3.js)  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      COUCHE API REST                         │
│              (Spring Boot - Controllers BI)                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE SERVICE BI                         │
│         (Services d'agrégation et calcul KPI)                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  COUCHE DATA ACCESS                          │
│    (Repositories + Vues SQL + Procédures stockées)           │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES                           │
│         (PostgreSQL + Vues matérialisées)                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Vues SQL Matérialisées à Créer

#### Vue 1 : sales_analytics_daily
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

CREATE INDEX idx_sales_analytics_date ON sales_analytics_daily(sale_date);
CREATE INDEX idx_sales_analytics_collector ON sales_analytics_daily(collector);
```

#### Vue 2 : collection_analytics_daily
```sql
CREATE MATERIALIZED VIEW collection_analytics_daily AS
SELECT 
    DATE(ct.payment_date) as collection_date,
    c.collector,
    COUNT(ct.id) as payment_count,
    SUM(ct.amount) as total_collected,
    AVG(ct.amount) as avg_payment,
    COUNT(CASE WHEN ct.is_on_time = true THEN 1 END) as on_time_count,
    COUNT(CASE WHEN ct.is_on_time = false THEN 1 END) as late_count
FROM credit_timeline ct
JOIN credit c ON ct.credit_id = c.id
GROUP BY DATE(ct.payment_date), c.collector;
```

#### Vue 3 : stock_analytics
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
    -- Calcul rotation (ventes 30 derniers jours / stock moyen)
    COALESCE(
        (SELECT SUM(ca.quantity) 
         FROM credit_articles ca 
         JOIN credit c ON ca.credit_id = c.id 
         WHERE ca.articles_id = a.id 
         AND c.accounting_date >= CURRENT_DATE - INTERVAL '30 days'),
        0
    ) as sales_last_30_days,
    CASE 
        WHEN a.stock_quantity > 0 THEN
            COALESCE(
                (SELECT SUM(ca.quantity) 
                 FROM credit_articles ca 
                 JOIN credit c ON ca.credit_id = c.id 
                 WHERE ca.articles_id = a.id 
                 AND c.accounting_date >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) / NULLIF(a.stock_quantity, 0)
        ELSE 0
    END as turnover_rate
FROM articles a;
```

#### Vue 4 : commercial_performance_monthly
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
```

#### Vue 5 : portfolio_overview
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
    COUNT(CASE WHEN solvency_note = 'LATE' THEN 1 END) as late_payers
FROM credit;
```

### 6.3 Endpoints API à Créer

#### Dashboard Overview
```java
GET /api/bi/dashboard/overview
  ?period={TODAY|WEEK|MONTH|YEAR|CUSTOM}
  &startDate={date}
  &endDate={date}
  
Response: {
  "sales": {
    "totalAmount": 12500000,
    "totalProfit": 3750000,
    "profitMargin": 30.0,
    "count": 156,
    "evolution": 15.3
  },
  "collections": {
    "totalCollected": 8200000,
    "collectionRate": 65.6,
    "evolution": -3.2
  },
  "stock": {
    "totalValue": 15000000,
    "itemsCount": 245,
    "lowStockCount": 32,
    "outOfStockCount": 15
  },
  "alerts": [...]
}
```

#### Sales Analytics
```java
GET /api/bi/sales/metrics
  ?period={period}&startDate={date}&endDate={date}
  &collector={collector}&clientType={type}
  
GET /api/bi/sales/by-commercial
GET /api/bi/sales/by-article
GET /api/bi/sales/trends
GET /api/bi/sales/comparison
```

#### Collection Analytics
```java
GET /api/bi/collections/metrics
GET /api/bi/collections/by-commercial
GET /api/bi/collections/overdue-analysis
GET /api/bi/collections/solvency-distribution
GET /api/bi/collections/forecast
```

#### Stock Analytics
```java
GET /api/bi/stock/overview
GET /api/bi/stock/by-category
GET /api/bi/stock/turnover-analysis
GET /api/bi/stock/movements
GET /api/bi/stock/alerts
GET /api/bi/stock/reorder-recommendations
```

#### Commercial Performance
```java
GET /api/bi/commercial/performance
  ?collector={collector}&period={period}
  
GET /api/bi/commercial/ranking
GET /api/bi/commercial/comparison
GET /api/bi/commercial/portfolio-analysis
```

#### Reports
```java
GET /api/bi/reports/daily?date={date}
GET /api/bi/reports/weekly?weekStart={date}
GET /api/bi/reports/monthly?month={month}&year={year}
GET /api/bi/reports/export?type={PDF|EXCEL}&report={type}
```

### 6.4 Services à Implémenter

#### BiDashboardService
```java
@Service
public class BiDashboardService {
    DashboardOverviewDto getOverview(PeriodFilter filter);
    List<AlertDto> getAlerts();
    TrendAnalysisDto getTrends(PeriodFilter filter);
}
```

#### SalesAnalyticsService
```java
@Service
public class SalesAnalyticsService {
    SalesMetricsDto getMetrics(SalesFilter filter);
    List<CommercialSalesDto> getSalesByCommercial(SalesFilter filter);
    List<ArticleSalesDto> getSalesByArticle(SalesFilter filter);
    TimeSeriesDto getSalesTrends(SalesFilter filter);
    ComparisonDto comparePerformance(PeriodFilter current, PeriodFilter previous);
    ProfitabilityAnalysisDto analyzeProfitability(SalesFilter filter);
}
```

#### CollectionAnalyticsService
```java
@Service
public class CollectionAnalyticsService {
    CollectionMetricsDto getMetrics(CollectionFilter filter);
    List<CommercialCollectionDto> getCollectionsByCommercial(CollectionFilter filter);
    OverdueAnalysisDto analyzeOverdue(CollectionFilter filter);
    SolvencyDistributionDto getSolvencyDistribution();
    ForecastDto forecastCollections(int daysAhead);
    PortfolioRiskDto analyzePortfolioRisk();
}
```

#### StockAnalyticsService
```java
@Service
public class StockAnalyticsService {
    StockOverviewDto getOverview();
    List<CategoryStockDto> getStockByCategory();
    TurnoverAnalysisDto analyzeTurnover();
    List<StockMovementDto> getRecentMovements(int days);
    List<StockAlertDto> getAlerts();
    List<ReorderRecommendationDto> getReorderRecommendations();
    StockValueAnalysisDto analyzeStockValue();
}
```

#### CommercialPerformanceService
```java
@Service
public class CommercialPerformanceService {
    CommercialPerformanceDto getPerformance(String collector, PeriodFilter filter);
    List<CommercialRankingDto> getRanking(RankingCriteria criteria);
    CommercialComparisonDto compareCommercials(List<String> collectors);
    PortfolioAnalysisDto analyzePortfolio(String collector);
    ClientSegmentationDto segmentClients(String collector);
}
```

#### ReportGenerationService
```java
@Service
public class ReportGenerationService {
    DailyReportDto generateDailyReport(LocalDate date);
    WeeklyReportDto generateWeeklyReport(LocalDate weekStart);
    MonthlyReportDto generateMonthlyReport(int month, int year);
    byte[] exportReport(ReportType type, ExportFormat format);
}
```

### 6.5 Jobs Planifiés

```java
@Component
public class BiScheduledJobs {
    
    // Rafraîchir les vues matérialisées
    @Scheduled(cron = "0 */15 * * * *") // Toutes les 15 minutes
    public void refreshMaterializedViews() {
        // REFRESH MATERIALIZED VIEW sales_analytics_daily
        // REFRESH MATERIALIZED VIEW collection_analytics_daily
        // etc.
    }
    
    // Calculer les KPI quotidiens
    @Scheduled(cron = "0 0 1 * * *") // 1h du matin
    public void calculateDailyKpis() {
        // Créer DailyBusinessSnapshot
        // Calculer métriques commerciaux
        // Mettre à jour scores de performance
    }
    
    // Générer alertes
    @Scheduled(cron = "0 0 8 * * *") // 8h du matin
    public void generateAlerts() {
        // Ruptures de stock
        // Crédits en retard
        // Objectifs non atteints
    }
    
    // Calculer prévisions
    @Scheduled(cron = "0 0 2 * * *") // 2h du matin
    public void calculateForecasts() {
        // Prévisions CA
        // Prévisions encaissements
        // Prévisions stock
    }
}
```

---

## 7. CALCULS ET FORMULES CLÉS

### 7.1 Indicateurs Financiers

```java
// Marge brute
profitMargin = totalAmount - totalPurchase

// Taux de marge
profitMarginPercentage = (profitMargin / totalPurchase) * 100

// ROI
roi = (profitMargin / totalPurchase) * 100

// Panier moyen
averageBasket = totalSales / salesCount

// Taux de recouvrement
collectionRate = (totalCollected / totalExpected) * 100
```

### 7.2 Indicateurs de Risque

```java
// Portfolio at Risk (PAR)
par7 = SUM(totalAmountRemaining WHERE expectedEndDate < TODAY - 7 days)
par15 = SUM(totalAmountRemaining WHERE expectedEndDate < TODAY - 15 days)
par30 = SUM(totalAmountRemaining WHERE expectedEndDate < TODAY - 30 days)

// Taux PAR
parRate = (parAmount / totalOutstanding) * 100

// Score de régularité de paiement
paymentRegularityScore = (onTimePayments / totalPayments) * 100

// Niveau de risque (règles métier)
if (lateDaysCount > 30 || parRate > 20) riskLevel = CRITICAL
else if (lateDaysCount > 15 || parRate > 10) riskLevel = HIGH
else if (lateDaysCount > 7 || parRate > 5) riskLevel = MEDIUM
else riskLevel = LOW
```

### 7.3 Indicateurs de Stock

```java
// Valeur du stock
stockValue = stockQuantity * purchasePrice

// Taux de rotation
turnoverRate = salesLast30Days / averageStock

// Couverture stock (jours)
daysOfStockAvailable = (stockQuantity / averageDailySales)

// Taux de disponibilité
availabilityRate = (articlesInStock / totalArticles) * 100

// Taux de rupture
stockoutRate = (stockoutDays / totalDays) * 100
```

### 7.4 Indicateurs de Performance Commerciale

```java
// Taux de conversion
conversionRate = (salesCount / prospectsCount) * 100

// Productivité commerciale
dailyProductivity = totalSales / workingDays

// Taux de rétention client
retentionRate = (returningClients / totalClients) * 100

// Valeur vie client (LTV)
ltv = averagePurchaseValue * purchaseFrequency * customerLifespan

// Coût d'acquisition client (CAC)
cac = totalMarketingCost / newCustomersCount
```

---

## 8. RECOMMANDATIONS D'IMPLÉMENTATION

### 8.1 Phase 1 : Fondations (Semaines 1-2)

**Objectif** : Mettre en place l'infrastructure de base

1. **Enrichissement des entités**
   - Ajouter les nouveaux champs dans Credit, Articles
   - Créer les nouvelles entités (CreditPaymentEvent, StockMovement, etc.)
   - Migrations de base de données

2. **Vues matérialisées**
   - Créer les 5 vues principales
   - Mettre en place le rafraîchissement automatique

3. **Services de base**
   - BiDashboardService (overview simple)
   - SalesAnalyticsService (métriques de base)

4. **API REST**
   - Endpoints dashboard overview
   - Endpoints sales metrics

### 8.2 Phase 2 : Analytics Ventes et Collections (Semaines 3-4)

1. **Services avancés**
   - SalesAnalyticsService complet
   - CollectionAnalyticsService complet

2. **Calculs automatiques**
   - Calcul automatique des marges
   - Calcul des scores de régularité
   - Calcul des niveaux de risque

3. **API REST**
   - Tous les endpoints ventes
   - Tous les endpoints collections

4. **Jobs planifiés**
   - Calcul KPI quotidiens
   - Génération alertes

### 8.3 Phase 3 : Analytics Stock (Semaines 5-6)

1. **Traçabilité stock**
   - Implémenter StockMovement
   - Historisation complète

2. **Services stock**
   - StockAnalyticsService complet
   - Calculs de rotation
   - Recommandations de réapprovisionnement

3. **API REST**
   - Tous les endpoints stock

### 8.4 Phase 4 : Dashboard Frontend (Semaines 7-9)

1. **Interface utilisateur**
   - Vue d'ensemble (homepage)
   - Module Ventes
   - Module Recouvrement
   - Module Stock

2. **Visualisations**
   - Graphiques interactifs (Chart.js ou D3.js)
   - Tableaux de données
   - Filtres dynamiques

3. **Responsive design**
   - Adaptation mobile/tablette

### 8.5 Phase 5 : Analytics Avancés (Semaines 10-12)

1. **Analyses prédictives**
   - Prévisions CA
   - Prévisions encaissements
   - Détection clients à risque

2. **Segmentation**
   - RFM Analysis
   - Analyse de cohorte

3. **Rapports**
   - Génération rapports PDF/Excel
   - Envoi automatique par email

### 8.6 Phase 6 : Optimisation et Monitoring (Semaines 13-14)

1. **Performance**
   - Optimisation requêtes
   - Mise en cache
   - Indexation

2. **Monitoring**
   - Logs et métriques
   - Alertes système

3. **Documentation**
   - Guide utilisateur
   - Documentation technique

---

## 9. CONSIDÉRATIONS TECHNIQUES

### 9.1 Performance

**Stratégies d'optimisation** :
- Vues matérialisées pour les agrégations lourdes
- Mise en cache Redis pour les KPI fréquemment consultés
- Pagination des résultats
- Calculs asynchrones pour les rapports lourds
- Indexation appropriée des tables

**Exemple cache** :
```java
@Cacheable(value = "dashboard-overview", key = "#filter.period")
public DashboardOverviewDto getOverview(PeriodFilter filter) {
    // ...
}
```

### 9.2 Sécurité

**Contrôle d'accès** :
- Rôles : ADMIN, MANAGER, COMMERCIAL
- ADMIN : Accès complet à tous les dashboards
- MANAGER : Accès à tous les commerciaux
- COMMERCIAL : Accès uniquement à ses propres données

```java
@PreAuthorize("hasRole('ADMIN') or (hasRole('COMMERCIAL') and #collector == authentication.name)")
public CommercialPerformanceDto getPerformance(String collector) {
    // ...
}
```

### 9.3 Scalabilité

**Architecture évolutive** :
- Séparation lecture/écriture (CQRS pattern)
- Base de données analytique séparée (option)
- Microservices pour BI (option future)
- Export vers data warehouse (option future)

---

## 10. EXEMPLES DE REQUÊTES ANALYTIQUES

### 10.1 Top 10 Commerciaux par CA

```sql
SELECT 
    collector,
    COUNT(*) as sales_count,
    SUM(total_amount) as total_revenue,
    SUM(total_amount - total_purchase) as total_profit,
    AVG(total_amount) as avg_sale,
    (SUM(total_amount - total_purchase) / SUM(total_purchase) * 100) as margin_rate
FROM credit
WHERE accounting_date BETWEEN :startDate AND :endDate
    AND status != 'CREATED'
GROUP BY collector
ORDER BY total_revenue DESC
LIMIT 10;
```

### 10.2 Évolution CA Mensuelle

```sql
SELECT 
    DATE_TRUNC('month', accounting_date) as month,
    SUM(total_amount) as revenue,
    SUM(total_amount - total_purchase) as profit,
    COUNT(*) as sales_count
FROM credit
WHERE accounting_date >= :startDate
GROUP BY DATE_TRUNC('month', accounting_date)
ORDER BY month;
```

### 10.3 Analyse PAR par Commercial

```sql
SELECT 
    c.collector,
    COUNT(CASE WHEN c.status = 'INPROGRESS' THEN 1 END) as active_credits,
    SUM(CASE WHEN c.status = 'INPROGRESS' THEN c.total_amount_remaining ELSE 0 END) as total_outstanding,
    SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE 
        THEN c.total_amount_remaining ELSE 0 END) as overdue_amount,
    (SUM(CASE WHEN c.status = 'INPROGRESS' AND c.expected_end_date < CURRENT_DATE 
        THEN c.total_amount_remaining ELSE 0 END) / 
     NULLIF(SUM(CASE WHEN c.status = 'INPROGRESS' THEN c.total_amount_remaining ELSE 0 END), 0) * 100) as par_rate
FROM credit c
GROUP BY c.collector
ORDER BY par_rate DESC;
```

### 10.4 Articles à Réapprovisionner

```sql
SELECT 
    a.id,
    a.name,
    a.category,
    a.stock_quantity,
    a.reorder_point,
    COALESCE(sales.qty_30d, 0) as sales_last_30_days,
    CASE 
        WHEN a.stock_quantity = 0 THEN 'CRITICAL'
        WHEN a.stock_quantity <= a.reorder_point THEN 'URGENT'
        ELSE 'NORMAL'
    END as urgency,
    GREATEST(a.optimal_stock_level - a.stock_quantity, 0) as recommended_order_qty
FROM articles a
LEFT JOIN (
    SELECT 
        ca.articles_id,
        SUM(ca.quantity) as qty_30d
    FROM credit_articles ca
    JOIN credit c ON ca.credit_id = c.id
    WHERE c.accounting_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY ca.articles_id
) sales ON a.id = sales.articles_id
WHERE a.stock_quantity <= a.reorder_point
ORDER BY urgency DESC, sales_last_30_days DESC;
```

### 10.5 Analyse RFM (Récence, Fréquence, Montant)

```sql
WITH customer_metrics AS (
    SELECT 
        client_id,
        MAX(accounting_date) as last_purchase_date,
        COUNT(*) as purchase_frequency,
        SUM(total_amount) as total_spent,
        AVG(total_amount) as avg_purchase
    FROM credit
    WHERE status != 'CREATED'
    GROUP BY client_id
),
rfm_scores AS (
    SELECT 
        client_id,
        NTILE(5) OVER (ORDER BY last_purchase_date DESC) as recency_score,
        NTILE(5) OVER (ORDER BY purchase_frequency) as frequency_score,
        NTILE(5) OVER (ORDER BY total_spent) as monetary_score
    FROM customer_metrics
)
SELECT 
    client_id,
    recency_score,
    frequency_score,
    monetary_score,
    (recency_score + frequency_score + monetary_score) as rfm_total,
    CASE 
        WHEN recency_score >= 4 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'Champions'
        WHEN recency_score >= 3 AND frequency_score >= 3 THEN 'Loyal Customers'
        WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'Promising'
        WHEN recency_score <= 2 AND frequency_score >= 3 THEN 'At Risk'
        WHEN recency_score <= 2 AND frequency_score <= 2 THEN 'Lost'
        ELSE 'Others'
    END as customer_segment
FROM rfm_scores
ORDER BY rfm_total DESC;
```

### 10.6 Prévision Encaissements 30 Prochains Jours

```sql
SELECT 
    DATE(begin_date + (generate_series * INTERVAL '1 day')) as expected_date,
    SUM(daily_stake) as expected_collection
FROM credit,
     generate_series(0, 30) as generate_series
WHERE status = 'INPROGRESS'
    AND begin_date + (generate_series * INTERVAL '1 day') <= expected_end_date
    AND begin_date + (generate_series * INTERVAL '1 day') BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
GROUP BY expected_date
ORDER BY expected_date;
```

---

## 11. MOCKUPS ET WIREFRAMES

### 11.1 Dashboard Overview (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ELYKIA BI Dashboard                    [Aujourd'hui ▼] [Cette semaine] [...]  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────┐│
│  │ CHIFFRE AFFAIRES │  │   MARGE BRUTE    │  │  ENCAISSEMENTS   │  │  STOCK  ││
│  │  12,500,000 F    │  │  3,750,000 F     │  │  8,200,000 F     │  │ 15.0M F ││
│  │  ↑ +15.3%        │  │  30% (↑ +2.1%)   │  │  65.6% (↓ -3.2%) │  │ ↓ -5.8% ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────┘│
│                                                                                 │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Évolution CA et Marge (12 mois)     │  │ Répartition par Type Client    │  │
│  │                                     │  │                                │  │
│  │  [Graphique ligne double]           │  │  [Graphique donut]             │  │
│  │                                     │  │  PROMOTER: 60%                 │  │
│  │                                     │  │  CLIENT: 40%                   │  │
│  └─────────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Top 10 Commerciaux                  │  │ Taux de Recouvrement           │  │
│  │                                     │  │                                │  │
│  │  [Graphique barres horizontales]    │  │  [Jauge circulaire]            │  │
│  │  Jean K.    ████████████ 3.2M       │  │       65.6%                    │  │
│  │  Marie D.   ██████████ 2.8M         │  │                                │  │
│  │  ...                                │  │  Objectif: 70%                 │  │
│  └─────────────────────────────────────┘  └────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔔 ALERTES ET NOTIFICATIONS                                              │  │
│  │  ⚠️ 5 articles en rupture de stock                                       │  │
│  │  ⚠️ 12 crédits en retard > 15 jours (450,000 FCFA)                      │  │
│  │  ✓ 3 commerciaux ont dépassé leur objectif mensuel                      │  │
│  │  ℹ️ Stock faible sur 8 articles (réapprovisionnement recommandé)        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Module Ventes (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  📊 ANALYSE DES VENTES                                                         │
├────────────────────────────────────────────────────────────────────────────────┤
│  Filtres: [Ce mois ▼] [Tous commerciaux ▼] [Tous types ▼] [Tous statuts ▼]   │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Nb Ventes    │  │ CA Total     │  │ Marge Totale │  │ Panier Moyen │      │
│  │    156       │  │ 12,500,000 F │  │ 3,750,000 F  │  │   80,128 F   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Évolution CA Journalier                                                 │  │
│  │  [Graphique ligne avec zone]                                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ Performance par Commercial         │  │ Top 10 Articles                  │ │
│  │                                    │  │                                  │ │
│  │ Commercial | Ventes | CA | Marge  │  │ Article | Qté | CA | Marge      │ │
│  │ ─────────────────────────────────  │  │ ──────────────────────────────  │ │
│  │ Jean K.    | 45 | 3.2M | 980K     │  │ iPhone 13 | 45 | 2.5M | 1.1M   │ │
│  │ Marie D.   | 38 | 2.8M | 850K     │  │ Samsung A54 | 38 | 1.8M | 540K │ │
│  │ ...                                │  │ ...                              │ │
│  │                                    │  │                                  │ │
│  │ [Voir détails →]                   │  │ [Voir détails →]                 │ │
│  └────────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Module Recouvrement (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  💰 ANALYSE DES RECOUVREMENTS                                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│  Filtres: [Ce mois ▼] [Tous commerciaux ▼] [Tous statuts ▼]                   │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Attendu          │  │ Collecté         │  │ Taux             │            │
│  │ 10,000,000 F     │  │ 6,560,000 F      │  │ 65.6%            │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ À Temps          │  │ En Retard        │  │ PAR 30j          │            │
│  │ 89 (72%)         │  │ 35 (28%)         │  │ 1,250,000 F      │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Encaissements Journaliers vs Attendu                                    │  │
│  │  [Graphique ligne double: Réalisé vs Attendu]                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ Distribution des Retards           │  │ Répartition Solvabilité          │ │
│  │                                    │  │                                  │ │
│  │  [Histogramme]                     │  │  [Donut]                         │ │
│  │  0-7j    ████████████████ 45       │  │  EARLY: 35%                      │ │
│  │  8-15j   ██████████ 28             │  │  TIME:  48%                      │ │
│  │  16-30j  █████ 12                  │  │  LATE:  15%                      │ │
│  │  >30j    ██ 5                      │  │  ND:    2%                       │ │
│  └────────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Top 10 Crédits en Retard                                                │  │
│  │                                                                          │  │
│  │ Référence | Client | Montant | Retard | Commercial | Action            │  │
│  │ ──────────────────────────────────────────────────────────────────────  │  │
│  │ CR-1234   | Ali M. | 85,000F | 32j    | Jean K.    | [Relancer]        │  │
│  │ CR-1567   | Fatou  | 65,000F | 28j    | Marie D.   | [Relancer]        │  │
│  │ ...                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Module Stock (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  📦 ANALYSE DES STOCKS                                                         │
├────────────────────────────────────────────────────────────────────────────────┤
│  Filtres: [Toutes catégories ▼] [Tous statuts ▼]                              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Valeur Totale    │  │ Nb Articles      │  │ Rotation Moyenne │            │
│  │ 15,000,000 F     │  │ 245              │  │ 6.8              │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Disponibles      │  │ Stock Faible     │  │ Ruptures         │            │
│  │ 198 (80.8%)      │  │ 32 (13.1%)       │  │ 15 (6.1%)        │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                                 │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ Répartition Valeur (Pareto)       │  │ Rotation par Catégorie           │ │
│  │                                    │  │                                  │ │
│  │  [Graphique Pareto]                │  │  [Graphique barres]              │ │
│  │  20% articles = 80% valeur         │  │  Smartphones: 8.5                │ │
│  │                                    │  │  Tablettes: 5.2                  │ │
│  │                                    │  │  Accessoires: 12.3               │ │
│  └────────────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ 🚨 ARTICLES À RÉAPPROVISIONNER                                          │  │
│  │                                                                          │  │
│  │ Article | Stock | Seuil | Ventes/Mois | Qté Recommandée | Urgence      │  │
│  │ ──────────────────────────────────────────────────────────────────────  │  │
│  │ Samsung A54 | 3 | 10 | 28 | 30 | 🔴 Urgent                              │  │
│  │ Tecno Spark | 0 | 5  | 15 | 20 | 🔴 Critique                            │  │
│  │ iPhone 13   | 8 | 15 | 45 | 40 | 🟡 Moyen                               │  │
│  │ ...                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. MÉTRIQUES DE SUCCÈS DU PROJET BI

### 12.1 Métriques d'Adoption

- **Taux d'utilisation** : % d'utilisateurs actifs quotidiens
- **Fréquence d'utilisation** : Nombre de connexions par utilisateur/jour
- **Temps passé** : Durée moyenne de session
- **Fonctionnalités utilisées** : % de modules consultés

**Objectifs** :
- 90% des managers utilisent le dashboard quotidiennement
- 70% des commerciaux consultent leurs performances hebdomadairement
- Temps moyen de session > 5 minutes

### 12.2 Métriques d'Impact Business

- **Amélioration du taux de recouvrement** : +X%
- **Réduction des ruptures de stock** : -X%
- **Amélioration de la rotation stock** : +X%
- **Réduction du PAR 30** : -X%
- **Augmentation de la marge** : +X%

**Objectifs** :
- Taux de recouvrement : passer de 65% à 75% en 6 mois
- Ruptures de stock : réduire de 50% en 3 mois
- PAR 30 : réduire de 12.5% à 8% en 6 mois

### 12.3 Métriques de Performance Technique

- **Temps de chargement** : < 2 secondes pour les dashboards
- **Disponibilité** : > 99.5%
- **Précision des données** : 100%
- **Fraîcheur des données** : < 15 minutes

---

## 13. RISQUES ET MITIGATION

### 13.1 Risques Identifiés

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Performance dégradée avec volume de données | Élevé | Moyen | Vues matérialisées, indexation, cache |
| Données incohérentes | Élevé | Faible | Validation stricte, transactions, tests |
| Adoption faible par les utilisateurs | Moyen | Moyen | Formation, UX simple, valeur démontrée |
| Complexité technique élevée | Moyen | Moyen | Architecture modulaire, documentation |
| Surcharge serveur | Moyen | Faible | Calculs asynchrones, optimisation requêtes |

### 13.2 Plan de Contingence

- **Backup quotidien** des vues matérialisées
- **Monitoring** en temps réel des performances
- **Rollback** possible à chaque phase
- **Support utilisateur** dédié pendant 3 mois post-lancement

---

## 14. FORMATION ET DOCUMENTATION

### 14.1 Formation Utilisateurs

**Managers** (4 heures) :
- Vue d'ensemble du dashboard
- Interprétation des KPI
- Utilisation des filtres
- Génération de rapports
- Prise de décision basée sur les données

**Commerciaux** (2 heures) :
- Consultation de leurs performances
- Compréhension des indicateurs
- Suivi de leur portefeuille
- Actions correctives

### 14.2 Documentation

- **Guide utilisateur** : Manuel complet avec captures d'écran
- **FAQ** : Questions fréquentes
- **Vidéos tutoriels** : Démonstrations courtes (2-5 min)
- **Documentation technique** : Architecture, API, maintenance

---

## 15. CONCLUSION ET PROCHAINES ÉTAPES

### 15.1 Résumé

Ce document spécifie un système BI complet et avancé pour le suivi des ventes à crédit et de la gestion de stock. Le système proposé offre :

✅ **17 catégories de KPI** couvrant ventes, recouvrement, stock et performance
✅ **6 modules principaux** : Overview, Ventes, Recouvrement, Stock, Analytics Avancés, Rapports
✅ **Nouvelles entités** pour enrichir les données et améliorer les analyses
✅ **Vues matérialisées** pour des performances optimales
✅ **API REST complète** pour l'intégration frontend
✅ **Analyses prédictives** pour anticiper les tendances
✅ **Plan d'implémentation** en 6 phases sur 14 semaines

### 15.2 Valeur Ajoutée

Le système BI permettra au gestionnaire de :
- **Prendre des décisions éclairées** basées sur des données en temps réel
- **Identifier rapidement** les problèmes (ruptures, retards, sous-performance)
- **Optimiser** la rentabilité et la trésorerie
- **Anticiper** les besoins en stock et les encaissements
- **Évaluer objectivement** la performance des commerciaux
- **Réduire les risques** financiers

### 15.3 Prochaines Étapes

1. **Validation** de cette spécification par les parties prenantes
2. **Priorisation** des fonctionnalités (MVP vs Nice-to-have)
3. **Estimation** détaillée des charges de développement
4. **Planification** du sprint de démarrage
5. **Kick-off** du projet avec l'équipe de développement

---

**Document préparé par** : Kiro AI Assistant  
**Date** : 18 Novembre 2025  
**Version** : 1.0  
**Statut** : Proposition initiale
