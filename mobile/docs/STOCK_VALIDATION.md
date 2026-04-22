# Validation des stocks dans l'initialisation

## Vue d'ensemble

Ce document décrit l'implémentation de la validation des stocks du commercial (Stock Tontine et Stock Commercial) dans le processus d'initialisation mobile.

## Problème résolu

Les commerciaux pouvaient partir sur le terrain avec des stocks incomplets ou des quantités incorrectes, ce qui entraînait :
- Des erreurs lors des livraisons tontine
- Des incohérences entre le mobile et le serveur
- Des difficultés à gérer les stocks disponibles

## Solution implémentée

### 1. Backend - Ajout des totaux de stocks dans le résumé

**Fichiers modifiés** :
- `backend/src/main/java/com/optimize/elykia/core/dto/CommercialDataSummaryDto.java`
- `backend/src/main/java/com/optimize/elykia/core/service/CommercialDataSummaryService.java`

**Champs ajoutés** :
```java
// Nombre d'items (lignes) dans le stock tontine
private Long totalTontineStockItems;

// Quantité totale disponible dans le stock tontine
private Long totalTontineStockAvailable;

// Nombre d'items (lignes) dans le stock commercial
private Long totalCommercialStockItems;

// Quantité totale restante dans le stock commercial
private Long totalCommercialStockRemaining;
```

**Requêtes SQL** :

1. **Stock Tontine - Nombre d'items** :
```sql
SELECT COUNT(*) 
FROM tontine_stock 
WHERE commercial = :collector
```

2. **Stock Tontine - Quantités disponibles** :
```sql
SELECT COALESCE(SUM(available_quantity), 0) 
FROM tontine_stock 
WHERE commercial = :collector
```

3. **Stock Commercial - Nombre d'items** :
```sql
SELECT COUNT(*) 
FROM commercial_monthly_stock_item cms_item 
JOIN commercial_monthly_stock cms ON cms_item.monthly_stock_id = cms.id 
WHERE cms.commercial = :collector
```

4. **Stock Commercial - Quantités restantes** :
```sql
SELECT COALESCE(SUM(cms_item.quantity_remaining), 0) 
FROM commercial_monthly_stock_item cms_item 
JOIN commercial_monthly_stock cms ON cms_item.monthly_stock_id = cms.id 
WHERE cms.commercial = :collector
```

### 2. Mobile - Méthodes de comptage des stocks

**Fichier modifié** : `mobile/src/app/core/services/database.service.ts`

**Méthodes ajoutées** :

1. **`countTontineStockItems(commercialUsername)`** :
   - Compte le nombre de lignes (articles différents) dans le stock tontine
   - Table : `tontine_stocks`

2. **`countTontineStockAvailable(commercialUsername)`** :
   - Somme des quantités disponibles dans le stock tontine
   - Champ : `availableQuantity`

3. **`countCommercialStockItems(commercialUsername)`** :
   - Compte le nombre de lignes (articles différents) dans le stock commercial
   - Tables : `stock_output_items` JOIN `stock_outputs`

4. **`countCommercialStockRemaining(commercialUsername)`** :
   - Somme des quantités restantes dans le stock commercial
   - Champ : `quantity` (correspond à `quantityRemaining` du backend)

### 3. Mobile - Intégration dans la validation

**Fichier modifié** : `mobile/src/app/core/services/initialization-validation.service.ts`

**Validation ajoutée** :
```typescript
// Récupération des totaux locaux
const localCounts = {
  // ... autres comptages
  tontineStockItems: await this.dbService.countTontineStockItems(commercialUsername),
  tontineStockAvailable: await this.dbService.countTontineStockAvailable(commercialUsername),
  commercialStockItems: await this.dbService.countCommercialStockItems(commercialUsername),
  commercialStockRemaining: await this.dbService.countCommercialStockRemaining(commercialUsername)
};

// Comparaison avec le serveur (tolérance 5%)
if (!this.isWithinTolerance(localCounts.tontineStockItems, serverSummary.totalTontineStockItems)) {
  missingData.push(`Items Stock Tontine (local: ${localCounts.tontineStockItems}, serveur: ${serverSummary.totalTontineStockItems})`);
}

if (!this.isWithinTolerance(localCounts.tontineStockAvailable, serverSummary.totalTontineStockAvailable)) {
  missingData.push(`Quantité Stock Tontine (local: ${localCounts.tontineStockAvailable}, serveur: ${serverSummary.totalTontineStockAvailable})`);
}

if (!this.isWithinTolerance(localCounts.commercialStockItems, serverSummary.totalCommercialStockItems)) {
  missingData.push(`Items Stock Commercial (local: ${localCounts.commercialStockItems}, serveur: ${serverSummary.totalCommercialStockItems})`);
}

if (!this.isWithinTolerance(localCounts.commercialStockRemaining, serverSummary.totalCommercialStockRemaining)) {
  missingData.push(`Quantité Stock Commercial (local: ${localCounts.commercialStockRemaining}, serveur: ${serverSummary.totalCommercialStockRemaining})`);
}
```

## Correspondance des modèles

### Stock Tontine

**Backend** : `TontineStock`
```java
private Integer availableQuantity;  // Quantité disponible pour distribution
```

**Mobile** : `TontineStock`
```typescript
availableQuantity: number;  // Quantité disponible
```

### Stock Commercial

**Backend** : `CommercialMonthlyStockItem`
```java
private Integer quantityRemaining;  // Quantité restante chez le commercial
```

**Mobile** : `StockOutputItem`
```typescript
quantity: number;  // Correspond à quantityRemaining du backend
```

## Validation complète

La validation vérifie maintenant :

1. **Nombre d'items** : Détecte si des articles manquent complètement
2. **Quantités** : Détecte si les quantités sont incorrectes

**Exemple de messages d'erreur** :
```
⚠️ Données incomplètes

Certaines données ne correspondent pas au serveur :

Items Stock Tontine (local: 8, serveur: 10)
Quantité Stock Tontine (local: 450, serveur: 500)
Items Stock Commercial (local: 15, serveur: 18)
Quantité Stock Commercial (local: 1200, serveur: 1350)

Vous pouvez continuer à travailler, mais certaines informations peuvent être manquantes.
```

## Avantages

1. **Détection précise** : Nombre d'items + quantités
2. **Sécurité** : Garantit que le commercial a tous ses stocks
3. **Traçabilité** : Logs détaillés des différences
4. **Flexibilité** : Tolérance de 5% pour les petites différences
5. **Prévention** : Évite les erreurs de livraison

## Cas d'usage

### Cas 1 : Article manquant
- **Serveur** : 10 items, 500 unités
- **Mobile** : 8 items, 450 unités
- **Détection** : ✅ Différence sur le nombre d'items ET les quantités
- **Message** : "Items Stock Tontine (local: 8, serveur: 10)"

### Cas 2 : Quantité incorrecte
- **Serveur** : 10 items, 500 unités
- **Mobile** : 10 items, 450 unités
- **Détection** : ✅ Différence uniquement sur les quantités
- **Message** : "Quantité Stock Tontine (local: 450, serveur: 500)"

### Cas 3 : Stock complet
- **Serveur** : 10 items, 500 unités
- **Mobile** : 10 items, 500 unités
- **Détection** : ✅ Aucune différence
- **Message** : "Initialisation terminée !"

## Logs backend

```
Summary generated for commercial1: 
  150 clients, 
  45 distributions, 
  200 recoveries, 
  30 tontine members, 
  10 tontine stock items (500 qty), 
  18 commercial stock items (1350 qty)
```

## Logs mobile

```
[InitializationValidation] Comparing server vs local data...
[InitializationValidation] Local counts: {
  clients: 150,
  distributions: 45,
  recoveries: 200,
  tontineMembers: 30,
  tontineStockItems: 10,
  tontineStockAvailable: 500,
  commercialStockItems: 18,
  commercialStockRemaining: 1350
}
[InitializationValidation] ✅ Data is complete and matches server
```

## Tests recommandés

### Test 1 : Stock complet
1. Initialiser avec tous les stocks
2. Vérifier que la validation passe
3. Vérifier les logs de comptage

### Test 2 : Article manquant
1. Supprimer un article du stock local
2. Initialiser
3. Vérifier que l'avertissement s'affiche
4. Vérifier le message d'erreur

### Test 3 : Quantité incorrecte
1. Modifier la quantité d'un article
2. Initialiser
3. Vérifier que l'avertissement s'affiche
4. Vérifier le message d'erreur

### Test 4 : Performance
1. Créer un stock avec ~50 articles
2. Mesurer le temps de comptage
3. Vérifier que la validation prend < 2 secondes

## Maintenance

### Métriques à suivre
- Nombre de validations échouées pour les stocks
- Différences moyennes entre serveur et mobile
- Temps de comptage des stocks
- Fréquence des avertissements de stocks incomplets

### Évolutions futures
1. Afficher le détail des articles manquants
2. Proposer une synchronisation automatique des stocks
3. Ajouter un indicateur visuel de l'état des stocks
4. Permettre une correction manuelle des quantités

## Auteur

Implémenté le 15 février 2026
Branch: `feature/enhance-sync`
