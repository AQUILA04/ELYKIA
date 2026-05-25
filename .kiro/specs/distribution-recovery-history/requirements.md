# Requirements: Distribution Recovery History

## Overview

Afficher dans le modal de détail d'une distribution la liste paginée des recouvrements liés à cette distribution, triés du plus récent au plus ancien, avec infinite scroll.

## Functional Requirements

### FR-1 : Affichage de la section historique
- Le modal `DistributionDetailComponent` doit afficher une section "Historique des recouvrements" en bas du contenu, après les boutons d'action.
- La section n'est affichée que si `distribution.id` est défini.

### FR-2 : Filtrage par distribution
- Seuls les recouvrements dont le `distributionId` correspond à la distribution courante sont affichés.
- Le filtre `commercialId` est toujours appliqué (isolation des données par commercial).

### FR-3 : Tri chronologique inversé
- Les recouvrements sont triés par `paymentDate DESC` (du plus récent au plus ancien).

### FR-4 : Pagination avec infinite scroll
- La première page (20 items) est chargée automatiquement à l'ouverture du modal.
- L'utilisateur peut charger les pages suivantes en scrollant vers le bas.
- Le scroll infini est désactivé quand il n'y a plus de pages disponibles.

### FR-5 : Affichage de chaque item
- Chaque item affiche : date (jour + mois), heure, montant en FCFA, méthode de paiement.
- Un badge indique l'état de synchronisation : "Sync" (vert, `cloud-done-outline`) ou "Local" (gris, `cloud-offline-outline`).

### FR-6 : États de l'interface
- **Chargement initial** : spinner affiché pendant le premier chargement.
- **Liste vide** : message "Aucun recouvrement pour cette distribution" si aucun résultat.
- **Erreur** : message d'erreur inline avec bouton "Réessayer".

### FR-7 : Navigation vers le détail
- Un clic sur un item ouvre le modal `RecoveryDetailComponent` pour ce recouvrement.

### FR-8 : Nettoyage à la fermeture
- L'état de pagination par distribution est réinitialisé à la destruction du composant enfant.

## Non-Functional Requirements

- **Performance** : pagination `LIMIT/OFFSET` côté SQLite, `ChangeDetectionStrategy.OnPush`, `trackBy` sur le `*ngFor`.
- **Isolation d'état** : le slot `distributionPagination` dans le store NgRx est séparé de la pagination globale.
- **Sécurité** : le filtre `commercialId` est obligatoire dans toutes les requêtes SQL.
