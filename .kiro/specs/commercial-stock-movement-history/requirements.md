# Requirements : Historique des Mouvements de Stock Commercial

## Contexte

Le système gère un stock mensuel par commercial (`CommercialMonthlyStock` / `CommercialMonthlyStockItem`). Actuellement, les opérations de vente (crédit ou cash) modifient les compteurs du stock sans laisser de trace. Il est impossible de savoir quand, combien, et dans quel contexte un article a été débité du stock d'un commercial.

## Objectif

Tracer chaque opération modifiant le stock mensuel d'un commercial afin de disposer d'un historique complet et consultable par item de stock ou par crédit.

---

## User Stories

### US-1 : Traçabilité d'une vente à crédit

**En tant que** gestionnaire,  
**je veux** voir l'historique des mouvements de stock pour chaque article distribué lors d'une vente à crédit,  
**afin de** savoir quelle quantité était disponible avant la vente, combien a été vendu, et ce qu'il reste.

**Critères d'acceptation :**
- Lors de chaque appel à `distributeArticlesV2`, un mouvement de type `CREDIT_SALE` est créé pour chaque article de la vente.
- Le mouvement contient : `quantityBefore`, `quantityMoved`, `quantityAfter`, l'id du crédit, la référence du crédit, le commercial, l'article, et la date/heure.
- Le mouvement est persisté dans la même transaction que la vente.

---

### US-2 : Traçabilité d'une vente au comptant

**En tant que** gestionnaire,  
**je veux** voir l'historique des mouvements de stock pour chaque article d'une vente au comptant,  
**afin de** suivre l'impact des ventes CASH sur le stock du commercial.

**Critères d'acceptation :**
- Lors de chaque vente CASH dans `startCredit`, un mouvement de type `CASH_SALE` est créé pour chaque article.
- Les mêmes champs que US-1 sont renseignés.

---

### US-3 : Consultation de l'historique par item de stock

**En tant que** gestionnaire,  
**je veux** consulter tous les mouvements d'un item de stock donné,  
**afin de** reconstituer l'évolution du stock pour cet article chez ce commercial sur le mois.

**Critères d'acceptation :**
- Un endpoint ou service permet de récupérer les mouvements d'un `CommercialMonthlyStockItem` triés par date décroissante.

---

### US-4 : Consultation de l'historique par crédit

**En tant que** gestionnaire,  
**je veux** voir tous les mouvements de stock liés à un crédit spécifique,  
**afin de** vérifier quels articles ont été débités du stock lors de cette vente.

**Critères d'acceptation :**
- Un endpoint ou service permet de récupérer les mouvements associés à un crédit donné.

---

## Règles métier

- `quantityBefore` est capturé **avant** toute modification du `stockItem` dans la transaction.
- `quantityAfter` est lu **après** l'appel à `stockItem.updateRemaining()`.
- Un mouvement est créé pour **chaque article** d'une vente, pas pour la vente globale.
- Le champ `credit` peut être `null` pour les types `STOCK_IN` et `ADJUSTMENT` (futurs cas d'usage).
- La persistance du mouvement ne doit pas bloquer la transaction principale en cas d'erreur (log + continue).

---

## Propriétés de Correction (Property-Based Testing)

### P1 : Conservation de la quantité
Pour tout mouvement de type `CREDIT_SALE` ou `CASH_SALE` :
```
quantityAfter == quantityBefore - quantityMoved
```

### P2 : Cohérence avec l'état du stock
Après une série de mouvements sur un `CommercialMonthlyStockItem`, la somme des `quantityMoved` de type `CREDIT_SALE` et `CASH_SALE` doit être égale à `quantitySold` de l'item.

### P3 : Non-négativité
`quantityAfter >= 0` pour tout mouvement (le stock ne peut pas être négatif).

### P4 : Référence crédit cohérente
Si `credit != null`, alors `creditReference == credit.getReference()`.
