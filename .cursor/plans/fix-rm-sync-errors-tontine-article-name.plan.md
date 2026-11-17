# Plan — RM sync-errors + commercialName tontine

## Problèmes

1. **Mobile RM** : depuis Plus / Terrain / Clients / Accueil, ouvrir `/sync-errors` renvoyait vers `/rm/plan` puis l’accueil des retards. Cause : `AuthGuard` n’autorisait que les URLs `/rm/*` pour le profil chef de recouvrement.
2. **Frontend tontine** : modale commande / livraison n’affichait que `article.name` ; le nom commercial manquait pour reconnaître l’article.

## Correctifs

1. `isRmSharedRoute` + whitelist `/sync-errors` dans `AuthGuard`.
2. Affichage `commercialName` (label) + `name` (sous-titre si distinct) dans `DeliveryArticleSelectionModalComponent` ; champ typé sur `ItemService.Article`.

## Hors scope

- Pas de maj guide utilisateur : la procédure RM « Erreurs de synchronisation » était déjà documentée ; seul le routage était cassé. Pas de changement de parcours métier côté tontine, seulement le libellé d’article.
