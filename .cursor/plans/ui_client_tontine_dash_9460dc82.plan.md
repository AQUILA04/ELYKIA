---
name: UI client tontine dash
overview: Restyler le popover menu client et l’écran Modifier le client ; corriger le chevauchement tontine (bug de pattern DS) et le bas du dashboard masqué par la tab bar — sans dark mode.
todos:
  - id: ui-client-menu
    content: Restyler client-menu popover (+ cssClass DS)
    status: completed
  - id: ui-edit-client
    content: Restyler edit-client (hero, elyk-card/fields, footer non tronqué)
    status: completed
  - id: ui-tontine-overlap
    content: "Tontine: réordonner search avant KPI (corriger overlap)"
    status: completed
  - id: ui-dash-scroll
    content: "Dashboard: padding bas pour actions rapides sous tab bar"
    status: completed
  - id: ui-version
    content: Bump mobile 2.28.3 + CHANGELOG
    status: completed
isProject: false
---

# UI — menu client, edit client, tontine, dashboard

Hors scope : dark mode (reporté).

## 1. Popover menu client (non restylé)

**Constat :** [`client-menu.component.html`](mobile/src/app/features/clients/components/client-menu/client-menu.component.html) = `ion-list` / `ion-item` Ionic brut, **pas de SCSS**. Ouvert depuis [`client-detail.page.ts`](mobile/src/app/features/clients/pages/client-detail/client-detail.page.ts) via `PopoverController`.

**Action :**
- Ajouter [`client-menu.component.scss`](mobile/src/app/features/clients/components/client-menu/client-menu.component.scss) : fond blanc, rayon, icônes navy, labels navy, item disabled muted (suppression grisée)
- Passer `cssClass: 'elyk-popover'` (ou `client-menu-popover`) à la création du popover + styles globaux légers dans [`elyk-ds.scss`](mobile/src/theme/elyk-ds.scss) pour le conteneur Ionic (ombre, border-radius, overflow)
- Préserver labels et comportements (`editDisabled`, `deleteDisabled`, etc.)

## 2. Modifier le client — cartes + footer

**Constat :** [`edit-client.page.html`](mobile/src/app/features/clients/pages/edit-client/edit-client.page.html) entièrement legacy (`ion-toolbar color="primary"`, `ion-card` Material, labels collés). **Aucun fichier SCSS**. Footer 2 colonnes tronque « ENREGISTRER ».

**Action :**
- Hero compact navy + `elyk-content`
- Sections en `.elyk-card` avec titres type DS ; champs en `.elyk-field` / `.elyk-field-label` (comme login) — espacement label / contrôle correct
- Footer sticky `.elyk-footer-bar` : Annuler outline + Enregistrer `elyk-btn-navy` (pleine largeur empilée ou grille avec `min-width: 0` / texte non tronqué)
- Créer [`edit-client.page.scss`](mobile/src/app/features/clients/pages/edit-client/edit-client.page.scss) et le déclarer dans le composant
- Conserver logique form / validations / modal localité (restyle légère de la modal si visible)

## 3. Tontine — chevauchement KPI / search = **bug**

**Ce n’est pas voulu pour une grille 2×2.**

Pattern DS prévu ([`elyk-ds.scss`](mobile/src/theme/elyk-ds.scss)) :
- `.elyk-search-overlap` → `margin-top: -22px` (chevauche l’élément **au-dessus**)
- Distributions : **hero → search → KPI** (search sur le hero)

Tontine actuel ([`tontine-dashboard.page.html`](mobile/src/app/features/tontine/dashboard/tontine-dashboard.page.html)) : **hero → KPI 2×2 → search-overlap** → la search remonte sur la **2ᵉ rangée de KPI** (Session / En attente).

**Fix :** réordonner comme Distributions — `hero` → `elyk-search-overlap` → `elyk-kpi-strip` (garder `--overlap` sur le strip pour qu’il remonte sous la search). Ajuster le padding local si besoin ; chips / liste inchangés.

## 4. Dashboard — dernière action rapide masquée

**Constat :** [`dashboard.page.scss`](mobile/src/app/tabs/dashboard/dashboard.page.scss) — `--padding-bottom: 0` et `.bottom-spacer { height: 32px }` insuffisant vs tab bar (~56–80px).

**Fix :** spacer / padding-bottom ≈ **96–112px** (safe-area inclus) pour que Tontine (et Stock si flag) restent visibles au scroll.

## 5. Version

Patch mobile **2.28.2 → 2.28.3** + [`docs/CHANGELOG.md`](docs/CHANGELOG.md).