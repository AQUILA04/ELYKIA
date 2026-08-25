---
name: UI polish vague 2
overview: Corriger les chevauchements hero/search/KPI (DS + articles/distributions/tontine), adoucir le CTA sélection client, et restyler rapport print, menus ActionSheet tontine, consentement journalier, alertes succès et menu détail membre.
todos:
  - id: p2-overlap
    content: "DS: search-overlap -28px; retirer kpi-strip--overlap après search (dist+tontine); fix article-list hero/search"
    status: completed
  - id: p2-client-cta
    content: Adoucir CTA Sélectionner un Client (recovery empty)
    status: completed
  - id: p2-rapport
    content: Restyler footer Imprimer le Rapport (rapport-journalier)
    status: completed
  - id: p2-sheets
    content: Styles elyk-action-sheet + brancher menus tontine dashboard et member-detail
    status: completed
  - id: p2-consent
    content: Restyler daily-consent-modal
    status: completed
  - id: p2-alerts
    content: Styles elyk-alert + cssClass sur alertes succès tontine
    status: completed
  - id: p2-version
    content: Bump mobile 2.28.4 + CHANGELOG
    status: completed
isProject: false
---

# UI polish — sélection, overlaps, tontine, rapport, consentement

Note : le plan précédent (menu client / edit-client / tontine reorder / dashboard spacer) est déjà livré en **2.28.3**. Cette vague traite les retours screenshots suivants.

## A. Chevauchements hero / search / KPI (cause racine DS)

Dans [`elyk-ds.scss`](mobile/src/theme/elyk-ds.scss) :
- Hero radius **28px** (compact **24px**)
- `.elyk-search-overlap` et `.elyk-kpi-strip--overlap` = **`margin-top: -22px`** chacun

Quand search **et** KPI ont `--overlap` (distributions, tontine), le KPI remonte sous la search (−44 effectif). Sur articles, le hero est dans `ion-header` et la search dans `ion-content` → tuck pire.

**Fix DS (une fois) :**
- Monter `.elyk-search-overlap` à **≈ −28px** (aligné rayon hero)
- Quand la search précède les KPI : **retirer** `elyk-kpi-strip--overlap` sur distributions + tontine (padding normal sous la search) — pattern clients

**Articles :** [`article-list.page.html`](mobile/src/app/features/articles/pages/article-list/) — aligner sur clients : hero + search dans le même flux `ion-content` (ou abandonner overlap si hero reste en header).

## B. CTA « Sélectionner un Client » (recouvrement)

Fichier : [`recovery.page.html`](mobile/src/app/features/recovery/recovery.page.html) / `.scss`

Le bouton `elyk-btn-navy` plein + ombre lourde domine la carte vide. **Adoucir** : variante outline / ghost dans la carte empty (icône + texte secondaire + bouton `elyk-btn-outline` ou navy plus compact, moins d’ombre). Préserver le libellé exact **« Sélectionner un Client »** (E2E). Harmoniser si besoin empty states new-distribution / base-transaction sans casser le submit navy principal.

## C. Rapport journalier — Imprimer

[`rapport-journalier.page.html`](mobile/src/app/features/rapport-journalier/pages/rapport-journalier/) + `.scss` : remplacer le footer Material `#2196F3` / radius 0 par `.elyk-footer-bar` + `.elyk-btn-navy`.

## D. Menus ActionSheet tontine (dashboard + détail membre)

- [`tontine-dashboard.page.ts`](mobile/src/app/features/tontine/dashboard/tontine-dashboard.page.ts) `showMenu()` — `cssClass: 'custom-action-sheet'` **sans CSS**
- [`member-detail.page.ts`](mobile/src/app/features/tontine/pages/member-detail/member-detail.page.ts) `showActions()` — pas de cssClass

**Fix :** styles globaux `.elyk-action-sheet` dans `elyk-ds.scss` (fond blanc, radius, icônes/labels navy, cancel muted, danger soft) + appliquer `cssClass: 'elyk-action-sheet'` sur les deux sheets.

## E. Consentement journalier

[`daily-consent-modal`](mobile/src/app/features/daily-consent/modals/daily-consent-modal/) : hero compact, champ `.elyk-field`, footer `elyk-btn-navy` / Annuler discret — plus de `color="primary"` Material ni label collé.

## F. Modal / alerte succès

Les `AlertController.create` sans `cssClass` restent Ionic brut (ex. inscription membre).

**Fix :** styles globaux `ion-alert.elyk-alert` + passer `cssClass: 'elyk-alert'` sur les alertes succès/confirm tontine (registration + member-detail au minimum). Pas de refonte de toutes les alertes app en une fois — périmètre tontine + points déjà identifiés.

## G. Version

Patch **2.28.3 → 2.28.4** + CHANGELOG.

## Hors scope

- Dark mode (reporté)
- Refonte complète du modal sélecteur client (sauf si CTA empty uniquement)
- Migration ActionSheet → composant custom dédié