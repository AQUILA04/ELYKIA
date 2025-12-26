# BI Dashboard - Référence API Complète

## 📡 Vue d'ensemble

Ce document liste tous les endpoints API du système BI Dashboard.

**Base URL :** `/api/v1/bi`  
**Authentification :** Bearer Token (JWT)  
**Rôles requis :** ADMIN, MANAGER  
**Format :** JSON

---

## 📦 Structure de Réponse Standard

Toutes les API retournent un objet `Response` avec la structure suivante :

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": { ... }
}
```

### Champs de Response

| Champ | Type | Description |
|-------|------|-------------|
| `status` | String | Statut HTTP (OK, CREATED, BAD_REQUEST, etc.) |
| `statusCode` | Integer | Code HTTP numérique (200, 201, 400, etc.) |
| `message` | String | Message de succès ou d'erreur |
| `service` | String | Nom du service (OPTIMIZE-SERVICE) |
| `data` | Object | Données de la réponse (DTO ou liste) |

### Exemple de Succès

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "totalAmount": 12500000,
    "totalProfit": 3750000,
    "count": 156
  }
}
```

### Exemple d'Erreur

```json
{
  "status": "BAD_REQUEST",
  "statusCode": 400,
  "message": "Validation error message",
  "service": "OPTIMIZE-SERVICE",
  "data": null
}
```

---

## 1. Dashboard Principal

### 1.1 Vue d'ensemble complète
```http
GET /api/v1/bi/dashboard/overview
```

**Paramètres :**
- `startDate` (optionnel) : Date de début (format: YYYY-MM-DD)
- `endDate` (optionnel) : Date de fin (format: YYYY-MM-DD)

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "sales": {
      "totalAmount": 12500000,
      "totalProfit": 3750000,
      "profitMargin": 30.0,
      "count": 156,
      "evolution": 15.3,
      "averageSaleAmount": 80128
    },
    "collections": {
      "totalCollected": 8200000,
      "collectionRate": 65.6,
      "evolution": -3.2,
      "onTimePaymentsCount": 89,
      "latePaymentsCount": 35
    },
    "stock": {
      "totalValue": 15000000,
      "itemsCount": 245,
      "lowStockCount": 32,
      "outOfStockCount": 15,
      "averageTurnoverRate": 6.8
    },
    "portfolio": {
      "activeCreditsCount": 120,
      "totalOutstanding": 8500000,
      "totalOverdue": 1250000,
      "par7": 450000,
      "par15": 850000,
      "par30": 1250000
    }
  }
}
```

### 1.2 Métriques de ventes
```http
GET /api/v1/bi/dashboard/sales/metrics
```

**Paramètres :** Identiques à 1.1

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "totalAmount": 12500000,
    "totalProfit": 3750000,
    "profitMargin": 30.0,
    "count": 156,
    "evolution": 15.3,
    "averageSaleAmount": 80128
  }
}
```

### 1.3 Métriques de recouvrement
```http
GET /api/v1/bi/dashboard/collections/metrics
```

**Paramètres :** Identiques à 1.1

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "totalCollected": 8200000,
    "collectionRate": 65.6,
    "evolution": -3.2,
    "onTimePaymentsCount": 89,
    "latePaymentsCount": 35
  }
}
```

### 1.4 Métriques de stock
```http
GET /api/v1/bi/dashboard/stock/metrics
```

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "totalValue": 15000000,
    "itemsCount": 245,
    "lowStockCount": 32,
    "outOfStockCount": 15,
    "averageTurnoverRate": 6.8
  }
}
```

### 1.5 Métriques du portefeuille
```http
GET /api/v1/bi/dashboard/portfolio/metrics
```

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "activeCreditsCount": 120,
    "totalOutstanding": 8500000,
    "totalOverdue": 1250000,
    "par7": 450000,
    "par15": 850000,
    "par30": 1250000
  }
}
```

---

## 2. Analyse des Ventes

### 2.1 Tendances des ventes par jour
```http
GET /api/v1/bi/sales/trends
```

**Paramètres :**
- `startDate` (optionnel) : Date de début (défaut: 30 jours avant)
- `endDate` (optionnel) : Date de fin (défaut: aujourd'hui)

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "date": "2025-11-01",
      "salesCount": 8,
      "totalAmount": 650000,
      "totalProfit": 195000,
      "averageSaleAmount": 81250
    },
    {
      "date": "2025-11-02",
      "salesCount": 12,
      "totalAmount": 980000,
      "totalProfit": 294000,
      "averageSaleAmount": 81667
    }
  ]
}
```

### 2.2 Performance des commerciaux
```http
GET /api/v1/bi/sales/by-commercial
```

**Paramètres :**
- `startDate` (optionnel) : Date de début (défaut: 1er du mois)
- `endDate` (optionnel) : Date de fin (défaut: aujourd'hui)

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "collector": "Jean K.",
      "periodStart": "2025-11-01",
      "periodEnd": "2025-11-18",
      "totalSalesCount": 45,
      "totalSalesAmount": 3200000,
      "totalProfit": 980000,
      "averageSaleAmount": 71111,
      "totalCollected": 2400000,
      "collectionRate": 75.0,
      "onTimePaymentsCount": 38,
      "latePaymentsCount": 7,
      "activeClientsCount": 38,
      "newClientsCount": 5,
      "clientRetentionRate": 92.5,
      "portfolioAtRisk": 280000,
      "criticalAccountsCount": 2
    }
  ]
}
```

### 2.3 Performance des articles
```http
GET /api/v1/bi/sales/by-article
```

**Paramètres :** Identiques à 2.2

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "articleId": 15,
      "articleName": "Smartphone: Samsung Galaxy A54",
      "category": "Téléphones",
      "quantitySold": 45,
      "totalRevenue": 2500000,
      "totalProfit": 1125000,
      "profitMargin": 45.0,
      "turnoverRate": 8.2,
      "stockQuantity": 12,
      "contributionToRevenue": 20.0
    }
  ]
}
```

---

## 3. Analyse des Recouvrements

### 3.1 Tendances des encaissements
```http
GET /api/v1/bi/collections/trends
```

**Paramètres :**
- `startDate` (optionnel) : Date de début (défaut: 30 jours avant)
- `endDate` (optionnel) : Date de fin (défaut: aujourd'hui)

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "date": "2025-11-01",
      "collected": 420000,
      "expected": 450000,
      "collectionRate": 93.3,
      "paymentsCount": 0
    },
    {
      "date": "2025-11-02",
      "collected": 385000,
      "expected": 450000,
      "collectionRate": 85.6,
      "paymentsCount": 0
    }
  ]
}
```

### 3.2 Analyse des retards par tranche
```http
GET /api/v1/bi/collections/overdue-analysis
```

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "range": "0-7 jours",
      "creditsCount": 45,
      "totalAmount": 450000,
      "percentage": 36.0
    },
    {
      "range": "8-15 jours",
      "creditsCount": 28,
      "totalAmount": 350000,
      "percentage": 28.0
    },
    {
      "range": "16-30 jours",
      "creditsCount": 12,
      "totalAmount": 280000,
      "percentage": 22.4
    },
    {
      "range": ">30 jours",
      "creditsCount": 5,
      "totalAmount": 170000,
      "percentage": 13.6
    }
  ]
}
```

---

## 4. Analyse du Stock

### 4.1 Toutes les alertes de stock
```http
GET /api/v1/bi/stock/alerts
```

**Réponse :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": [
    {
      "articleId": 23,
      "articleName": "Smartphone: Tecno Spark 10",
      "category": "Téléphones",
      "currentStock": 0,
      "reorderPoint": 5,
      "recommendedQuantity": 20,
      "urgency": "CRITICAL",
      "averageMonthlySales": 15.0,
      "daysOfStockRemaining": 0
    },
    {
      "articleId": 18,
      "articleName": "Smartphone: Samsung Galaxy A54",
      "category": "Téléphones",
      "currentStock": 3,
      "reorderPoint": 10,
      "recommendedQuantity": 27,
      "urgency": "HIGH",
      "averageMonthlySales": 28.0,
      "daysOfStockRemaining": 3
    }
  ]
}
```

### 4.2 Articles en rupture de stock
```http
GET /api/v1/bi/stock/out-of-stock
```

**Réponse :** Même format que 4.1, filtré sur `currentStock = 0`

### 4.3 Articles en stock faible
```http
GET /api/v1/bi/stock/low-stock
```

**Réponse :** Même format que 4.1, filtré sur `currentStock > 0` et sous seuil

---

## 📊 Codes de Statut HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès refusé (rôle insuffisant) |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

---

## 🔐 Authentification

Tous les endpoints nécessitent un token JWT valide dans le header :

```http
Authorization: Bearer <votre_token_jwt>
```

---

## 📅 Format des Dates

Toutes les dates utilisent le format ISO 8601 : `YYYY-MM-DD`

Exemples :
- `2025-11-01`
- `2025-11-18`

---

## 🎯 Exemples d'Utilisation

### Exemple 1 : Dashboard du mois en cours
```bash
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Exemple 2 : Ventes de la semaine dernière
```bash
curl -X GET "http://localhost:8080/api/v1/bi/sales/trends?startDate=2025-11-11&endDate=2025-11-17" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Exemple 3 : Performance des commerciaux du mois
```bash
curl -X GET "http://localhost:8080/api/v1/bi/sales/by-commercial?startDate=2025-11-01&endDate=2025-11-18" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Exemple 4 : Alertes de stock
```bash
curl -X GET "http://localhost:8080/api/v1/bi/stock/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Notes Importantes

1. **Dates par défaut** : Si non spécifiées, les dates par défaut sont :
   - Dashboard : Mois en cours
   - Tendances : 30 derniers jours

2. **Performance** : Les requêtes sur de longues périodes peuvent prendre plus de temps

3. **Cache** : Certaines métriques peuvent être mises en cache pour améliorer les performances

4. **Pagination** : Actuellement non implémentée, toutes les données sont retournées

5. **Filtres** : Des filtres supplémentaires peuvent être ajoutés selon les besoins

---

## 🔄 Mises à Jour Automatiques

Les données sont mises à jour automatiquement :
- **En temps réel** : Lors des créations de crédits et paiements
- **Quotidiennement** : Snapshots à 1h du matin
- **Hebdomadairement** : Performances le lundi à 3h
- **Mensuellement** : Performances le 1er à 2h

---

**Version :** 1.0  
**Date :** 18 novembre 2025  
**Statut :** Production Ready ✅
