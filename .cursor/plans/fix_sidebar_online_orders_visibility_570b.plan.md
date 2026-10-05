---
name: Fix sous-menu Commandes Services en ligne
overview: "Le sous-menu Commandes sous Services en ligne était masqué pour ADMIN/SUPER_ADMIN car ngxPermissionsOnly exigeait ROLE_CONSULT_ORDER/EDIT_ORDER absents de ces profils, alors qu'Inscriptions acceptait ROLE_ADMIN."
todos:
  - id: sidebar-role-admin
    content: Ajouter ROLE_ADMIN au sous-menu et menu Commandes + classe collapse in/show
    status: completed
  - id: backend-perms
    content: Ajouter ORDER perms aux profils ADMIN/SUPER_ADMIN + init rattrapage comptes existants
    status: completed
  - id: changelog
    content: Versions Frontend 2.27.1 / Backend 1.27.3 + CHANGELOG
    status: in_progress
isProject: false
---

# Fix visibilité sous-menu Commandes (Services en ligne)

## Cause

- Parent **Services en ligne** : visible si non magasinier / non chef de recouvrement (pas de filtre ORDER).
- Sous-menu **Inscriptions** : `ROLE_ADMIN` inclus.
- Sous-menu **Commandes** : seulement `ROLE_CONSULT_ORDER` / `ROLE_EDIT_ORDER`.
- Profils **ADMIN** / **SUPER_ADMIN** dans `application.yml` : pas de permissions ORDER → JWT sans ces rôles → sous-menu invisible (alors qu'Inscriptions et Paiements restent visibles).

## Correctifs

1. Sidebar : ajouter `ROLE_ADMIN` aux entrées Commandes (menu principal + Services en ligne) ; lier `aria-expanded` et classe `in`/`show` pour l’ouverture.
2. `application.yml` : `ROLE_CONSULT_ORDER`, `ROLE_EDIT_ORDER` sur ADMIN et SUPER_ADMIN.
3. `AdminOrderPermissionsInit` : rattrapage des comptes existants au démarrage (même pattern que `RecoveryManagerDefaultPermissionsInit`).
