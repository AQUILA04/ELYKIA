---
name: Inventaire UX et stock non négatif
overview: Améliorer l’expérience de réconciliation sur longues listes avec une interface en 2 colonnes sticky, et sécuriser côté backend toutes les réconciliations pour empêcher un stock final négatif.
todos:
  - id: frontend-layout-2col
    content: Refondre inventory-reconciliation.component.html en vue 2 colonnes avec panneau de réconciliation sticky.
    status: pending
  - id: frontend-styles-responsive
    content: Adapter inventory-reconciliation.component.scss pour sticky desktop, overflow propre, et fallback mobile.
    status: pending
  - id: frontend-ui-harmonization
    content: Harmoniser le style de la page de réconciliation sur le design system des pages crédit (palette, cartes, boutons, badges, états hover/focus/disabled).
    status: pending
  - id: backend-clamp-stock
    content: Ajouter clamp global stock >= 0 et harmoniser stock final / history / movement dans InventoryReconciliationService.
    status: pending
  - id: bulk-reconciliation-ui
    content: Ajouter la sélection multiple des articles (même statut uniquement) et des actions de réconciliation en lot dans l'écran de réconciliation.
    status: pending
  - id: bulk-reconciliation-backend
    content: Exposer un endpoint de réconciliation en lot traitant plusieurs inventoryItemId avec la même action et des retours de succès/échec par article.
    status: pending
  - id: verify-critical-cases
    content: Valider manuellement les cas métier clés (dette totale, dette partielle, surplus), la UX sur liste >100 et la réconciliation en lot.
    status: pending
isProject: false
---

# Plan d'amélioration réconciliation inventaire

## Objectif
- Réduire la friction utilisateur quand il y a beaucoup d’articles à réconcilier en gardant la liste et le formulaire visibles en même temps.
- Garantir la règle métier `stockQuantity >= 0` pour toutes les actions de réconciliation d’inventaire.
- Permettre une réconciliation en lot via sélection multiple d’articles de même statut.

## Changements frontend (UX)
- Refactorer la page de réconciliation vers un layout 2 colonnes dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.html](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.html):
  - Colonne gauche: tableau des écarts (scrollable si long).
  - Colonne droite: panneau de réconciliation sticky (détails + actions) qui reste visible pendant le scroll.
- Mettre à jour les styles dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.scss](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.scss):
  - Grille responsive desktop/mobile.
  - Position sticky du panneau droit avec offset cohérent avec l’entête.
  - Gestion des hauteurs/overflow pour lisibilité sur grands volumes.
- Ajouter des repères visuels dans la liste (ligne sélectionnée) pour garder le contexte article actif.
- Harmoniser l’UI avec le style déjà adopté sur:
  - [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-late/credit-late.component.html](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-late/credit-late.component.html)
  - [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-late/credit-late.component.scss](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-late/credit-late.component.scss)
  - [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-details/credit-details.component.html](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-details/credit-details.component.html)
  - [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-details/credit-details.component.scss](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/credit/credit-details/credit-details.component.scss)
  - Détails à appliquer: variables de thème (`--navy`, `--border`, `--radius`), boutons unifiés (primary/outline/warning/info avec hover/focus/disabled), cartes blanches avec bordure/ombre légère, badges statut cohérents, typo et espacements homogènes.
- Ajouter la sélection multiple dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.html](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.html):
  - Cases à cocher par ligne + option “tout sélectionner” sur la page.
  - Contrainte de sélection: tous les articles sélectionnés doivent avoir le même statut (`DEBT` ou `SURPLUS`).
  - Barre d’actions de lot affichée selon le statut sélectionné, avec toutes les actions existantes (Ajuster, Marquer dette, Annuler dette, Marquer surplus) et désactivation des actions incompatibles.
- Étendre la logique du composant dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.ts](c:/Users/kahonsu/Documents/GitHub/ELYKIA/frontend/src/app/inventory/inventory-reconciliation/inventory-reconciliation.component.ts):
  - État des sélections (`selectedIds`, `selectedStatus`, compteurs).
  - Validation client avant envoi en lot (statut homogène, au moins un article).
  - Déclenchement des actions unitaires existantes ou d’une nouvelle action en lot selon le mode.

## Changements backend (règle stock non négatif)
- Corriger la logique de calcul du stock final dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/service/store/InventoryReconciliationService.java](c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/service/store/InventoryReconciliationService.java):
  - Introduire un calcul sécurisé du stock final (`max(0, stockBefore + adjustment)`) dans les flux de réconciliation (dette et surplus).
  - Utiliser ce stock final normalisé pour:
    - la mise à jour de `article.stockQuantity`,
    - `reconciliation.stockAfter`,
    - `ArticleHistory.finalQuantity`.
  - Ajuster la quantité enregistrée dans `StockMovement`/`ArticleHistory` pour refléter l’ajustement réellement appliqué (éviter de tracer une quantité incohérente si un clamp à 0 a été nécessaire).
- Vérifier que le comportement est cohérent avec la contrainte `@PositiveOrZero` de l’entité article.

## Changements backend (réconciliation en lot)
- Ajouter une API de réconciliation en lot dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/controller/inventory/InventoryReconciliationController.java](c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/controller/inventory/InventoryReconciliationController.java):
  - Entrée: liste `inventoryItemIds` + `action` + commentaire + options dette.
  - Sortie: résultat par article (succès/échec/message), pour ne pas bloquer tout le lot en cas d’erreur isolée.
- Implémenter le traitement en service dans [c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/service/store/InventoryReconciliationService.java](c:/Users/kahonsu/Documents/GitHub/ELYKIA/backend/src/main/java/com/optimize/elykia/core/service/store/InventoryReconciliationService.java):
  - Boucle contrôlée sur les IDs sélectionnés.
  - Réutilisation des méthodes de réconciliation unitaires pour garder les règles métier centralisées.
  - Vérification de cohérence statut/action pour chaque item avant traitement.

## Validation
- Frontend:
  - Vérifier qu’avec >100 articles, l’utilisateur peut sélectionner et réconcilier sans perdre le formulaire.
  - Vérifier le responsive mobile (retour en pile verticale).
  - Vérifier la sélection multiple: sélection homogène par statut, actions disponibles/incompatibles, et feedback utilisateur.
  - Vérifier l’harmonisation visuelle: cohérence des boutons (taille/couleur/états), contraste lisible, et alignement avec les pages crédit de référence.
- Backend:
  - Cas dette: système=5, physique=0, ajuster => stock final attendu `0` (jamais `-5`).
  - Cas dette partielle: système=10, physique=3 => stock final `3`.
  - Cas surplus: système=3, physique=7 => stock final `7`.
  - Cas lot mixte rejeté côté backend (si statuts incompatibles ou action invalide pour un item).
- Régression:
  - Vérifier que les autres actions (`MARK_AS_DEBT`, `CANCEL_DEBT`, `MARK_AS_SURPLUS`) restent fonctionnelles et historisées correctement.
  - Vérifier qu’une réconciliation unitaire continue de fonctionner comme avant.
