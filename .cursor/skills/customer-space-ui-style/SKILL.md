---
name: customer-space-ui-style
description: >
  Impose le style UI premium de l'Espace Client ELYKIA (Angular 20 + Ionic 8 /
  Capacitor) aligné sur les maquettes wireflow. À appliquer systématiquement pour
  toute tâche touchant customer-space/ : pages features, composants shared, thème
  global, auth wizard, dashboard, catalogue, panier, paiement.
---

# Style UI Espace Client ELYKIA (Ionic)

## Quand appliquer ce skill

- Création ou modification d'une **page Ionic** visible dans `customer-space/`
- Refonte HTML/SCSS d'un écran (auth, dashboard, achats, catalogue, etc.)
- Nouveaux composants shared (`recovery-pills`, `credit-progress-card`, …)
- Thème global (`variables.scss`, `global.scss`, `index.html`)

**Ne pas** appliquer pour : logique TS pure, services API, guards, tests unitaires seuls.

**Ne pas** confondre avec [`frontend-ui-style`](../frontend-ui-style/SKILL.md) (back-office Angular Material).

## Références obligatoires (lire avant d'implémenter)

| Référence | Fichier |
|-----------|---------|
| Specs fonctionnelles | [SPECIFICATIONS.md](customer-space/docs/wireflow/SPECIFICATIONS.md) |
| Prototype interactif | [wireflow.html](customer-space/docs/wireflow/wireflow.html) |
| Maquettes PNG S-01 à S-11 | [screens/](customer-space/docs/wireflow/screens/) |
| Mapping détaillé écran → fichier | [screens.md](screens.md) |
| Auth (base) | [auth.page.scss](customer-space/src/app/features/auth/auth.page.scss) |
| Dashboard (base) | [dashboard.page.scss](customer-space/src/app/features/dashboard/dashboard.page.scss) |
| Pastilles recouvrement | [recovery-pills.component.ts](customer-space/src/app/shared/components/recovery-pills/recovery-pills.component.ts) |

## Design tokens (`--elyk-*`)

Déclarer dans [`variables.scss`](customer-space/src/theme/variables.scss) :

| Token | Valeur |
|-------|--------|
| `--elyk-navy` | `#0D1B2A` |
| `--elyk-navy-mid` | `#1A2E42` |
| `--elyk-gold` | `#C9922A` |
| `--elyk-gold-light` | `#F0C66A` |
| `--elyk-cream` | `#FAF6EE` |
| `--elyk-gray-bg` | `#F1F4F8` |
| `--elyk-gray-text` | `#64748B` |
| `--elyk-green` | `#22C55E` |
| `--elyk-orange` | `#F97316` |
| `--elyk-red` | `#EF4444` |
| `--elyk-blue` | `#60A5FA` |
| `--elyk-gray-pill` | `#D1D5DB` |
| `--elyk-radius` | `16px` |
| `--elyk-radius-btn` | `12px` |
| `--elyk-radius-input` | `10px` |
| `--elyk-shadow` | `0 2px 12px rgba(13,27,42,0.08)` |
| `--elyk-shadow-lg` | `0 4px 24px rgba(13,27,42,0.10)` |

## Typographie

- **Playfair Display** (700) : logo, titres de page, titres de cartes
- **DM Sans** (300–600) : corps, labels, boutons
- Charger via Google Fonts dans [`index.html`](customer-space/src/index.html)

## Structure page Ionic

```
ion-header.ion-no-border
  ion-toolbar (fond blanc, titre navy)
ion-content.page-content
  .page-inner (padding 16px)
    contenu
```

## Patterns par type d'écran

### Auth (S-02)
- `.auth-content` fond cream
- `.auth-wrapper` centré, min-height 100vh
- `.auth-logo` : `.logo-text` Playfair + `.logo-sub` gold uppercase
- `.auth-card` : blanc, radius 20px, shadow-lg, max-width 400px
- Inputs : `--background: var(--elyk-gray-bg)`, `--border-radius: 10px`
- Bouton primaire : gold, radius 12px, font-weight 600
- Wizard multi-étapes : téléphone local (sans +228) → PIN ou OTP+PIN

### Dashboard (S-03)
- `app-credit-progress-card` en tête
- `.quick-actions` : grille 3 colonnes, `.qa-btn` carte blanche + icône gold
- `.section-title` + `.activity-list` / `.activity-item`

### Cartes & listes
- Fond blanc, `border-radius: 16px`, `box-shadow: var(--elyk-shadow)`
- Hover léger sur items cliquables (`transform: scale(1.02)` max)

### Pastilles recouvrement (S-06)
Couleurs strictes :
- VALIDÉ → `#22C55E`
- INITIÉ → `#F97316`
- RETARD → `#EF4444`
- RESTANT → `#D1D5DB`

### États
- Chargement : `ion-spinner.center-spinner`
- Vide : `.empty-state` avec `.empty-icon`, `.empty-title`, `.empty-sub`

### Safe areas Capacitor
```scss
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

## Anti-patterns

- Palette Inter/navy du back-office (`frontend-ui-style`)
- `mat-button` / Angular Material
- Couleurs Ionic par défaut non surchargées
- Styles inline (`style="..."`)
- Indicatif `+228` visible dans le champ téléphone (saisie locale uniquement)
- Stocker `+228` dans le username ou les appels API métier

## Checklist avant livraison

```
- [ ] Maquette PNG correspondante consultée
- [ ] Tokens --elyk-* utilisés (pas de couleurs ad hoc)
- [ ] Playfair + DM Sans actives
- [ ] ion-content fond cream, cartes blanches radius 16px
- [ ] Boutons gold radius 12px
- [ ] Responsive 360–430px
- [ ] États chargement et vide présents
- [ ] Safe areas Capacitor sur header/footer si applicable
```
