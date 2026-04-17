# Audit de Performance des Stores NgRx - Rapport & Plan d'Action

**Date :** 25 Février 2026
**Statut :** Critique - Optimisations Requises

Ce document recense les stores NgRx qui ne respectent pas encore les standards de performance "Zero Select All" (chargement complet des données en mémoire).

## 1. État des Lieux

| Store | Statut | Problème Identifié | Impact Performance |
| :--- | :---: | :--- | :--- |
| **Client** | ✅ Compliant | Pagination implémentée, sélecteurs legacy dépréciés. | Faible |
| **Recovery** | ✅ Compliant | Pagination implémentée. | Faible |
| **Distribution** | ✅ Compliant | Pagination implémentée. | Faible |
| **Tontine** | ✅ Compliant | Pagination implémentée pour membres, collectes, livraisons. | Faible |
| **KPI** | ✅ Compliant | Architecture découplée nativement. | Nul |
| **Auth** | ✅ Compliant | Données unitaires. | Nul |
| **Sync** | ✅ Compliant | Gère des processus, pagination présente pour la sélection manuelle. | Faible |
| **Commercial** | ✅ Compliant | Données unitaires ou très faible volume. | Nul |
| **Order** | ⚠️ Partiel | Pagination présente mais `selectOrders` (full list) existe encore. | Moyen |
| **Account** | ❌ Non-Compliant | `selectAllAccounts` charge tout. `selectAccountByClientId` itère sur tout. | **Élevé** (Volumétrie = Clients) |
| **Article** | ❌ Non-Compliant | `selectAllArticles` charge tout. Pas de pagination. | Moyen (Catalogue peut grossir) |
| **Locality** | ❌ Non-Compliant | `selectAllLocalities` charge tout. | Faible (Volume modéré) |
| **Stock Output** | ❌ Non-Compliant | `selectAllStockOutputs` charge tout. | Moyen |
| **Commercial Stock** | ❌ Non-Compliant | `selectAllCommercialStockItems` charge tout. | Moyen |
| **Transaction** | ❌ Non-Compliant | `selectAllTransactions` charge tout. | **Élevé** (Historique grossit vite) |

---

## 2. Plan d'Action Prioritaire

### Phase 1 : Stores Critiques (Account & Transaction)

Ces stores ont une cardinalité égale ou supérieure à celle des clients. Ils doivent être traités en priorité pour éviter les OOM (Out of Memory).

#### A. Store `Account`
1.  **Refactoring :** Transformer `AccountState` pour utiliser `@ngrx/entity` (si ce n'est pas déjà le cas) mais ne charger que les comptes nécessaires (liés aux clients affichés).
2.  **Pagination :** Ajouter la logique de pagination si une vue "Liste des Comptes" existe.
3.  **Optimisation Sélecteur :** Remplacer `selectAccountByClientId` (qui fait un `.find()` sur tout le tableau) par une map ou un lookup direct via Entity Adapter si l'ID du compte est connu, ou charger le compte à la demande.
    *   *Note :* Le store Client utilise déjà une map optimisée des comptes. Vérifier si le store Account est encore nécessaire sous sa forme actuelle de "liste complète".

#### B. Store `Transaction`
1.  **Pagination Obligatoire :** L'historique des transactions est infini. Il est impératif de ne charger que les N dernières transactions ou une page spécifique.
2.  **Repository :** Ajouter `findTransactionsByClientPaginated` dans `TransactionRepository`.
3.  **Store :** Implémenter `loadTransactionsByClient` (paginé) et supprimer `loadAllTransactions`.

### Phase 2 : Stores de Gestion (Order, Article, Stock)

#### C. Store `Order`
1.  **Nettoyage :** Marquer `selectOrders` comme `@deprecated`.
2.  **Migration UI :** Vérifier que toutes les vues utilisent `selectPaginatedOrders`.

#### D. Store `Article`
1.  **Pagination :** Implémenter la pagination pour la sélection d'articles lors d'une commande/distribution.
2.  **Recherche Serveur :** Remplacer le filtrage local par une recherche SQL via Repository.

#### E. Store `Stock Output` & `Commercial Stock`
1.  **Pagination :** Mettre en place la pagination standard.

### Phase 3 : Stores de Référence (Locality)

#### F. Store `Locality`
1.  **Évaluation :** Si le nombre de localités est < 500, le chargement complet est acceptable. Sinon, passer en pagination ou chargement à la demande (recherche).

---

## 3. Standard Technique "Zero Select All"

Pour tout nouveau développement ou refactoring, la règle suivante s'applique :

> **Interdiction formelle d'exposer un sélecteur de type `selectAll` qui retourne le contenu brut d'un tableau d'entités potentiellement volumineux.**

**Pattern autorisé :**
```typescript
// ✅ BON : Retourne une page spécifique
export const selectPaginatedItems = createSelector(
  selectPaginationState,
  (pagination) => pagination.items
);

// ✅ BON : Retourne un item spécifique par ID (Lookup O(1))
export const selectItemById = (id: string) => createSelector(
  selectEntityState,
  (state) => state.entities[id]
);
```

**Pattern interdit :**
```typescript
// ❌ MAUVAIS : Retourne tout le dataset
export const selectAllItems = createSelector(
  selectFeatureState,
  (state) => state.items // ou adapter.getSelectors().selectAll
);
```
