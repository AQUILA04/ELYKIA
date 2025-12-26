# BI Dashboard - Guide de Démarrage Rapide

## 🚀 Démarrage en 5 Minutes

### 1. Migration de la Base de Données
```bash
# Exécuter la migration Flyway
./mvnw flyway:migrate

# Ou au démarrage de l'application Spring Boot
# La migration s'exécutera automatiquement
```

### 2. Vérifier l'Installation
```bash
# Tester l'endpoint principal
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Utiliser les API

#### Dashboard Principal
```bash
GET /api/v1/bi/dashboard/overview
```

#### Ventes
```bash
GET /api/v1/bi/sales/trends
GET /api/v1/bi/sales/by-commercial
GET /api/v1/bi/sales/by-article
```

#### Recouvrements
```bash
GET /api/v1/bi/collections/trends
GET /api/v1/bi/collections/overdue-analysis
```

#### Stock
```bash
GET /api/v1/bi/stock/alerts
GET /api/v1/bi/stock/out-of-stock
GET /api/v1/bi/stock/low-stock
```

---

## 📊 Ce qui se Passe Automatiquement

### Lors de la Création d'un Crédit
✅ Calcul automatique des marges  
✅ Évaluation du niveau de risque  
✅ Enregistrement des mouvements de stock  
✅ Détermination de la période saisonnière  

### Lors d'un Paiement
✅ Enregistrement de l'événement de paiement  
✅ Calcul du score de régularité  
✅ Mise à jour du taux de complétion  
✅ Réévaluation du risque  

### Tâches Automatiques (Scheduler)
✅ **1h du matin** : Snapshot quotidien  
✅ **2h (1er du mois)** : Performances mensuelles  
✅ **3h (lundi)** : Performances hebdomadaires  

---

## 🔐 Sécurité

**Rôles requis :** ADMIN ou MANAGER

Tous les endpoints nécessitent un token JWT :
```http
Authorization: Bearer <votre_token>
```

---

## 📚 Documentation Complète

- **API Reference** : `BI_DASHBOARD_API_REFERENCE.md`
- **Phase 1** : `BI_DASHBOARD_PHASE1_IMPLEMENTATION.md`
- **Phase 2** : `BI_DASHBOARD_PHASE2_COMPLETE.md`
- **Résumé Final** : `BI_DASHBOARD_FINAL_SUMMARY.md`

---

## ✅ Checklist de Vérification

- [ ] Migration Flyway exécutée
- [ ] Tables créées (credit_payment_event, stock_movement, etc.)
- [ ] Colonnes ajoutées dans credit et articles
- [ ] Endpoint /overview répond correctement
- [ ] Scheduler activé (vérifier les logs)
- [ ] Créer un crédit et vérifier l'enrichissement
- [ ] Effectuer un paiement et vérifier le tracking

---

## 🎯 Exemple Complet

```bash
# 1. Créer un crédit
POST /api/v1/credits
{
  "clientId": 1,
  "articles": [
    {"articlesId": 5, "quantity": 2}
  ],
  "advance": 50000
}

# 2. Vérifier l'enrichissement
GET /api/v1/credits/{id}
# Vérifier : profitMargin, riskLevel, seasonPeriod

# 3. Voir le dashboard
GET /api/v1/bi/dashboard/overview

# 4. Voir les tendances
GET /api/v1/bi/sales/trends?startDate=2025-11-01&endDate=2025-11-18

# 5. Voir les alertes de stock
GET /api/v1/bi/stock/alerts
```

---

## 🆘 Problèmes Courants

### Erreur 403 (Forbidden)
➡️ Vérifier que l'utilisateur a le rôle ADMIN ou MANAGER

### Erreur 401 (Unauthorized)
➡️ Vérifier que le token JWT est valide

### Données vides
➡️ Vérifier qu'il y a des crédits dans la période sélectionnée

### Scheduler ne s'exécute pas
➡️ Vérifier que `@EnableScheduling` est activé dans la configuration Spring

---

## 📞 Support

Pour plus d'informations, consulter :
- `BI_DASHBOARD_FINAL_SUMMARY.md` : Vue d'ensemble complète
- `BI_DASHBOARD_API_REFERENCE.md` : Référence API détaillée

---

**Prêt à utiliser ! 🎉**
