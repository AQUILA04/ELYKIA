---
name: Notifications page DS
overview: "Refondre la page `/notifications` (Bootstrap `list-group` / `btn-outline`) pour suivre le design system ELYKIA : breadcrumb, header-card navy, KPI, liste groupée, états vide/chargement — sans changer la logique métier ni le toast déjà corrigé."
todos:
  - id: notif-ds-html-scss
    content: Refonte HTML/SCSS page notifications (header, KPI, liste, empty)
    status: completed
  - id: notif-ds-ts
    content: "TS : clock, lastUpdate, getters KPI, encapsulation"
    status: completed
  - id: notif-ds-guide-changelog
    content: Guide si besoin + RAG + bump version + CHANGELOG
    status: in_progress
isProject: false
---

# Alignement DS page Notifications

## Contexte

[`notifications-page.component.html`](frontend/src/app/notifications/pages/notifications-page/notifications-page.component.html) est encore un layout Bootstrap (`container-fluid`, `btn-outline-*`, `list-group-item-primary`). SCSS quasi vide. Le module est déjà lazy (`loadChildren`).

Référence visuelle / structure : [`sale-cancellation.component.html`](frontend/src/app/credit/sale-cancellation/sale-cancellation.component.html) + skill [`frontend-ui-style`](.cursor/skills/frontend-ui-style/SKILL.md).

Hors scope : cloche header, toast login (déjà exclu `TONTINE_CATCHUP`), API.

## Structure cible

```
.main-container.notifications-page.a1
  .breadcrumb-bar (Tableau de bord + horloge live)
  .page-header-card.a2
    surtitre NOTIFICATIONS · CENTRE D'ALERTES
    title-group (icône cloche SVG + h1 Notifications)
    actions : .btn-primary « Tout lire » + .btn-refresh « Actualiser »
    .page-subtitle « Opérations en attente de validation. »
  .kpi-strip.a3 (2 cartes)
    Total · Non lues
  .table-card.a5
    groupes par date + lignes cliquables
    empty-state / loading
```

## Implémentation

### HTML / SCSS / TS

Fichiers :
- [`notifications-page.component.html`](frontend/src/app/notifications/pages/notifications-page/notifications-page.component.html)
- [`notifications-page.component.scss`](frontend/src/app/notifications/pages/notifications-page/notifications-page.component.scss)
- [`notifications-page.component.ts`](frontend/src/app/notifications/pages/notifications-page/notifications-page.component.ts)

Détails :
- `ViewEncapsulation.None` + tous les sélecteurs préfixés `.notifications-page`
- Palette tokens navy / Inter / DM Mono (comme sale-cancellation)
- `currentDate` (interval 1s) + `lastUpdate` au `load()` ; `OnDestroy` pour clear interval
- Getters `totalCount` / `unreadCount` pour les KPI
- Lignes : fond `--navy-xpale` si non lue ; badge type (Paiement / Commande / Rattrapage / Cotisation) en pill DS ; montant en DM Mono
- Conserver `data-testid="e2e-notifications-page"` et `e2e-notifications-item`
- Pas de `mat-button` / Bootstrap `btn-*` sur les actions principales

### Module

Si besoin du `routerLink` breadcrumb : s’assurer que `RouterModule` est disponible via le routing module (déjà le cas avec `NotificationsRoutingModule`).

### Guide + changelog

- Léger alignement libellés / structure dans [`user-guide/docs/manager/operations.md`](user-guide/docs/manager/operations.md) (section centre de notifications) si le parcours décrit change (header, KPI) — style métier uniquement
- `python user-guide/generate_rag_index.py` si le guide est touché
- Bump Frontend PATCH (`2.22.14` → `2.22.15` si déjà 14) + entrée [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Critères de done

- Page sans `list-group` / `btn-outline` Bootstrap
- Breadcrumb + header-card + KPI + liste / empty-state conformes
- Clic ligne / Tout lire / Actualiser inchangés fonctionnellement
- E2E testids préservés
