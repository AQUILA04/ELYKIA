---
name: UI annulation ventes
overview: "Refonte UI de la page Annulation de ventes : remplacer les Swal bruts par AlertService, corriger les contrastes (titres blancs sur navy/rouge), éliminer le bleu ciel Bootstrap, et aligner liste + modales sur le style frontend ELYKIA."
todos:
  - id: alert-service
    content: Remplacer tous les Swal.fire par AlertService dans sale-cancellation.component.ts
    status: completed
  - id: contrast-modals
    content: Forcer texte/icônes blancs sur headers navy et danger des modales
    status: completed
  - id: button-colors
    content: Remplacer bleu ciel Bootstrap (Fermer, Télécharger, Actualiser, text-primary) par navy/gris projet
    status: completed
  - id: list-ui-style
    content: Aligner page liste sur frontend-ui-style (header-card, data-table, badges, empty states)
    status: completed
  - id: changelog
    content: Bump frontend 2.22.13 + entrée CHANGELOG
    status: completed
isProject: false
---

# Refonte UI Annulation de ventes

## Contexte

Feature isolée sous [`frontend/src/app/credit/sale-cancellation/`](frontend/src/app/credit/sale-cancellation/) (route `/credit/annulation`). Domaine `credit` déjà lazy — pas de migration.

**Cause contraste titres :** dans [`styles.scss`](frontend/src/styles.scss), `h3 { color: var(--text-primary) }` (navy) s’applique aux titres des modales. Le SCSS local met `color: #fff` sur `.modal-header` mais **pas** sur le `h3` → texte navy illisible sur fond navy/rouge.

**Cause bleu ciel :** `btn-outline-primary`, `btn-secondary`, `text-primary` Bootstrap + `cancelButtonColor: '#3085d6'` / `confirmButtonColor: '#d33'` dans les `Swal.fire` bruts.

## Approche retenue

- Alertes / confirmations → [`AlertService`](frontend/src/app/shared/service/alert.service.ts) uniquement (plus d’`import Swal`).
- Modales métier (détail run, nouvelle annulation) → **conservées en HTML custom** (formulaires + onglets trop lourds pour Swal/AlertService) ; styles corrigés.
- Page liste → structure du skill [`frontend-ui-style`](frontend/.cursor/skills/frontend-ui-style/SKILL.md) (comme `client-list`).
- Boutons secondaires (Fermer, Actualiser, Télécharger) → gris outline / `.btn-refresh` ; actions fortes → navy primaire ou rouge danger (CTA annulation).

## 1. Remplacer SweetAlert brut par AlertService

Fichier : [`sale-cancellation.component.ts`](frontend/src/app/credit/sale-cancellation/sale-cancellation.component.ts)

| Aujourd’hui | Remplacement |
|-------------|--------------|
| `Swal.fire(..., 'error'/'warning'/'info')` | `alertService.showError` / `showWarning` / `showInfo` |
| Confirm HTML + `#d33` / `#3085d6` | `alertService.showConfirmation(title, html, 'Oui, exécuter l\'annulation', 'Annuler')` — le HTML riche (counts, liste, warning exclus) reste supporté car `AlertService` injecte dans `html:` |
| Succès post-exécution | `alertService.showSuccess(html, 'Annulation réussie')` |

Injecter `AlertService`, supprimer `import Swal`. Boutons Swal = thème `.custom-swal-*` (navy + gris), plus Material sky/rouge.

## 2. Contraste headers modales

Dans [`sale-cancellation.component.scss`](frontend/src/app/credit/sale-cancellation/sale-cancellation.component.scss), forcer explicitement :

```scss
.modal-header,
.modal-header.header-danger {
  h3, .modal-title, mat-icon { color: #ffffff !important; }
}
```

Même règle pour icônes de fermeture déjà en blanc.

## 3. Couleurs boutons / liens

HTML + SCSS de la feature :

- **Actualiser** → classe projet `.btn-refresh` (navy outline), pas Bootstrap.
- **Fermer** (pieds de modales) → `.btn-clear` / outline gris (`--text-muted` / bordure `--border`), texte navy ou gris foncé — **pas** `btn-secondary` / primary Bootstrap.
- **Télécharger** → `.btn-download` ou bouton outline navy/gris (pas `btn-outline-primary`).
- **Simuler** → `.btn-primary` scopé page (fond `--navy`, texte **blanc**).
- **Nouvelle annulation** / **Confirmer l’annulation** → garder rouge danger, texte **blanc** explicite.
- Montants tableau : remplacer `text-primary` Bootstrap par token navy page (`--navy`).

## 4. Alignement liste sur le design system

Refactor HTML/SCSS de la page (même fichier composant) selon le skill :

- Conteneur `.main-container.sale-cancellation-page.a1`
- `.breadcrumb-bar` + horloge live (`currentDate` / `lastUpdate` comme `client-list`)
- `.page-header-card` (surtitre, titre, `.btn-refresh`, CTA rouge ADMIN)
- `.table-card` > `.data-table` (en-têtes uppercase navy sur `--navy-xpale`, hover, `.btn-detail` pour l’œil)
- Badges statut / commercial : pastilles style projet (pas sky `#e0f2fe` / `#0369a1`)
- États vide / chargement conformes
- Variables CSS page (`--navy`, `--border`, etc.) ; sélecteurs préfixés `.sale-cancellation-page` (déjà `ViewEncapsulation.None`)

Conserver tous les `data-testid` e2e existants.

## 5. Modales détail / nouvelle annulation

Sans changer le flux métier :

- Headers : texte/icônes blancs (point 2)
- Footer Fermer + liens Télécharger : gris / navy (point 3)
- Mini-KPI / liste fichiers : bordures et typo alignées tokens page (éviter soft-blue `#0284c7` pour actions)
- Liste fichiers : cartes sobres type projet (bordure `--border`, pas lien sky)

## 6. Changelog

- Bump [`frontend/package.json`](frontend/package.json) (`2.22.12` → `2.22.13`)
- Entrée [`docs/CHANGELOG.md`](docs/CHANGELOG.md) (refonte UI annulation ventes)

Pas de maj user-guide : mêmes libellés et parcours, changement purement visuel/technique alertes.

## Fichiers touchés

- `frontend/src/app/credit/sale-cancellation/sale-cancellation.component.ts`
- `frontend/src/app/credit/sale-cancellation/sale-cancellation.component.html`
- `frontend/src/app/credit/sale-cancellation/sale-cancellation.component.scss`
- `frontend/package.json`
- `docs/CHANGELOG.md`
- éventuellement `.cursor/plans/` si commit demandé plus tard

## Hors scope

- Backend / API / PDF audit
- Migration MatDialog des grandes modales
- Extension de l’API `AlertService` (non nécessaire : `showConfirmation` accepte déjà du HTML)