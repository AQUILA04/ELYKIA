# Plan de Migration : Stock-Output vers Commercial Stock Items

## 📋 **RÉSUMÉ EXÉCUTIF**

Cette migration vise à simplifier la gestion des stocks dans l'application mobile en remplaçant le système complexe de `StockOutput` par une approche directe avec `CommercialStockItem`. 

**Objectifs :**
- ✅ Éliminer la complexité du matching stock-output → distribution
- ✅ Supprimer la dépendance `creditId` dans les distributions
- ✅ Améliorer les performances avec une structure de données plate
- ✅ Réduire le nombre de requêtes pour la validation des stocks

---

## 🔍 **ANALYSE DE L'IMPACT**

### **Fichiers Impactés (13 fichiers principaux)**

#### **Modèles et Interfaces**
- `mobile/src/app/models/stock-output.model.ts` → **DÉPRÉCIÉ**
- `mobile/src/app/models/stock-output-item.model.ts` → **DÉPRÉCIÉ**
- `mobile/src/app/models/distribution.model.ts` → **MODIFIÉ** (creditId optionnel)
- `mobile/src/app/models/commercial-stock-item.model.ts` → **NOUVEAU**

#### **Services**
- `mobile/src/app/core/services/stock-output.service.ts` → **DÉPRÉCIÉ**
- `mobile/src/app/core/services/commercial-stock.service.ts` → **NOUVEAU**
- `mobile/src/app/core/services/data-initialization.service.ts` → **MODIFIÉ**
- `mobile/src/app/core/services/distribution.service.ts` → **MODIFIÉ**

#### **Repositories**
- `mobile/src/app/core/repositories/commercial-stock.repository.ts` → **NOUVEAU**

#### **Store NgRx (7 fichiers)**
- `mobile/src/app/store/stock-output/*` → **DÉPRÉCIÉ**
- `mobile/src/app/store/commercial-stock/*` → **NOUVEAU**

#### **Composants**
- `mobile/src/app/tabs/dashboard/dashboard.page.ts` → **MODIFIÉ**
- `mobile/src/app/features/distributions/pages/new-distribution/new-distribution.page.ts` → **MODIFIÉ MAJEUR**

#### **Mappers**
- `mobile/src/app/shared/mapper/stock-outpout.mapper.ts` → **DÉPRÉCIÉ**
- `mobile/src/app/shared/mapper/distribution.mapper.ts` → **MODIFIÉ**

---

## 🚀 **PLAN DE MIGRATION DÉTAILLÉ**

### **PHASE 1 : Préparation et Infrastructure (✅ TERMINÉ)**
- [x] Créer le modèle `CommercialStockItem`
- [x] Créer le repository `CommercialStockRepository`
- [x] Créer le service `CommercialStockService`
- [x] Créer le store NgRx pour `CommercialStock`
- [x] Ajouter la table `commercial_stock_items` au schéma de base

### **PHASE 2 : Mise à Jour du DataInitializationService**
- [ ] Ajouter l'initialisation des stocks commerciaux
- [ ] Remplacer `calculateArticleStocks()` par une approche directe
- [ ] Mettre à jour `initializeAllData()` pour inclure les stocks commerciaux
- [ ] Créer une méthode de migration des données existantes

### **PHASE 3 : Refactoring de la Création de Distribution**
- [ ] Supprimer la logique complexe de matching dans `new-distribution.page.ts`
- [ ] Implémenter la validation simple avec `CommercialStockRepository`
- [ ] Supprimer la dépendance `creditId` dans la création de distribution
- [ ] Mettre à jour la réduction des stocks après création

### **PHASE 4 : Mise à Jour du Dashboard**
- [ ] Remplacer les KPIs basés sur `StockOutput` par `CommercialStockItem`
- [ ] Mettre à jour les calculs de `stockOutputAmount` et `undistributedAmount`
- [ ] Adapter les sélecteurs NgRx

### **PHASE 5 : Nettoyage et Dépréciation**
- [ ] Marquer les anciens services comme `@deprecated`
- [ ] Supprimer les références aux stock-outputs dans les composants
- [ ] Nettoyer les imports inutilisés
- [ ] Mettre à jour les tests unitaires

### **PHASE 6 : Tests et Validation**
- [ ] Tester la création de distributions
- [ ] Valider les calculs de KPIs
- [ ] Vérifier la synchronisation des données
- [ ] Tests de régression complets

---

## 🔧 **DÉTAILS TECHNIQUES**

### **Nouvelle Structure de Données**

```typescript
// AVANT (Complexe)
StockOutput {
  id: string;
  items: StockOutputItem[];
}
Distribution {
  creditId: string; // Référence vers StockOutput.id
}

// APRÈS (Simple)
CommercialStockItem {
  articleId: number;
  quantityRemaining: number;
}
Distribution {
  creditId?: string; // Optionnel, plus utilisé
}
```

### **Nouvelle API Backend**
```
GET /api/commercial-stocks/available/{commercialUsername}
→ Retourne CommercialStockItemDto[]
```

### **Flux de Données Simplifié**

```
Backend API (/api/commercial-stocks/available/{username})
    ↓
CommercialStockService.fetchCommercialStockFromApi()
    ↓
CommercialStockRepository.saveWithCommercialUsername()
    ↓
Store dispatch CommercialStockActions.loadCommercialStock()
    ↓
Composants utilisent selectAvailableStockItems
```

---

## ⚠️ **RISQUES ET MITIGATION**

### **Risques Identifiés**
1. **Perte de données** : Migration des stocks existants
2. **Régression fonctionnelle** : Validation des stocks
3. **Performance** : Nouvelles requêtes de base de données

### **Stratégies de Mitigation**
1. **Migration progressive** : Maintenir les deux systèmes temporairement
2. **Tests exhaustifs** : Validation de tous les scénarios
3. **Rollback plan** : Possibilité de revenir à l'ancien système

---

## 📊 **MÉTRIQUES DE SUCCÈS**

### **Performance**
- [ ] Réduction de 60% du nombre de requêtes pour la validation des stocks
- [ ] Temps de création de distribution < 2 secondes
- [ ] Temps de chargement du dashboard < 1 seconde

### **Complexité du Code**
- [ ] Suppression de 300+ lignes de code complexe
- [ ] Réduction de 13 à 6 fichiers pour la gestion des stocks
- [ ] Élimination de la logique de matching

### **Fonctionnalité**
- [ ] 100% des distributions créées avec succès
- [ ] KPIs du dashboard corrects
- [ ] Synchronisation des données fonctionnelle

---

## 🗓️ **TIMELINE ESTIMÉ**

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Phase 1 | ✅ Terminé | - |
| Phase 2 | 1 jour | Phase 1 |
| Phase 3 | 2 jours | Phase 2 |
| Phase 4 | 1 jour | Phase 3 |
| Phase 5 | 1 jour | Phase 4 |
| Phase 6 | 2 jours | Phase 5 |

**Total estimé : 7 jours de développement**

---

## 📝 **PROCHAINES ÉTAPES**

1. **Valider ce plan** avec l'équipe technique
2. **Commencer la Phase 2** : DataInitializationService
3. **Préparer les tests** pour chaque phase
4. **Planifier la migration** des données en production

---

## 🔗 **RÉFÉRENCES**

- Backend API: `CommercialMonthlyStockController.getAvailableItems()`
- Frontend Model: `CommercialStockItemDto`
- Database Schema: `commercial_stock_items` table