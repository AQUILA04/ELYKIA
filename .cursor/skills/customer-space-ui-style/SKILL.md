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
- Nouveaux composants shared (`shared/ui/`, `recovery-pills`, `credit-progress-card`, …)
- Thème global (`variables.scss`, `global.scss`, `index.html`)

**Ne pas** appliquer pour : logique TS pure, services API, guards, tests unitaires seuls.

**Ne pas** confondre avec [`frontend-ui-style`](../frontend-ui-style/SKILL.md) (back-office Angular Material).

## Références obligatoires (lire avant d'implémenter)

| Référence | Fichier |
|-----------|---------|
| **Design system (prioritaire)** | [design-system.md](design-system.md) |
| Specs fonctionnelles | [SPECIFICATIONS.md](customer-space/docs/wireflow/SPECIFICATIONS.md) |
| Prototype interactif | [wireflow.html](customer-space/docs/wireflow/wireflow.html) |
| Maquettes PNG S-01 à S-11 | [screens/](customer-space/docs/wireflow/screens/) |
| Mapping écran → fichier | [screens.md](screens.md) |
| Composants UI shared | [shared/ui/](customer-space/src/app/shared/ui/) |
| Tokens & styles globaux | [variables.scss](customer-space/src/theme/variables.scss), [global.scss](customer-space/src/global.scss) |

## Règle fondamentale : design system d'abord

Chaque nouvel écran **doit** composer les briques `shared/ui/` — ne pas recréer header, champs ou cartes en SCSS local.

```typescript
import {
  ElykDecorHeaderComponent,
  ElykOverlapCardComponent,
  ElykOutlinedFieldComponent,
} from '../../shared/ui';
```

Voir le détail complet dans [design-system.md](design-system.md).

## Deux archétypes de page

| Type | Header | Écrans (maquettes) |
|------|--------|-------------------|
| **A — Decor** | `app-elyk-decor-header` + SVG motif | S-01, S-02, S-03 |
| **B — Plain** | `ion-header` + `elyk-toolbar-plain` | S-04 à S-11 (sauf cas notés) |

## Assets décoratifs

| Fichier | Usage |
|---------|-------|
| `assets/decor/header-ribbons.svg` | Auth, splash, flows « connexion » |
| `assets/decor/header-grid.svg` | Dashboard, accueil profil |

**Ne pas** dupliquer ni recréer ces motifs en CSS.

## Design tokens (`--elyk-*`)

Déclarés dans [`variables.scss`](customer-space/src/theme/variables.scss) :

| Token | Valeur / rôle |
|-------|---------------|
| `--elyk-navy` | `#0D1B2A` |
| `--elyk-navy-mid` | `#1A2E42` |
| `--elyk-gold` | `#C9922A` |
| `--elyk-gold-light` | `#F0C66A` |
| `--elyk-cream` | `#FAF6EE` |
| `--elyk-gray-bg` | `#F1F4F8` (remplissage interne, pas champs auth) |
| `--elyk-gray-text` | `#64748B` |
| `--elyk-green` / `--elyk-orange` / `--elyk-red` | Statuts |
| `--elyk-radius` / `--elyk-radius-btn` / `--elyk-radius-input` / `--elyk-radius-card` | Rayons |
| `--elyk-shadow` / `--elyk-shadow-lg` / `--elyk-shadow-btn` | Ombres |
| `--elyk-header-height` | `220px` |
| `--elyk-header-gradient` | Navy dégradé |
| `--elyk-card-overlap` | `-56px` |

## Typographie

- **Playfair Display** (700) : titres émotionnels (« Bon retour ! »), montants — classe `.elyk-title-serif`
- **DM Sans** (300–600) : UI, labels, boutons, toolbar
- Google Fonts dans [`index.html`](customer-space/src/index.html)

## Boutons (2 variants maquette)

| Classe | Visuel | Quand |
|--------|--------|-------|
| `elyk-btn-navy` | Navy + bordure gold | CTA auth, certains formulaires (S-02, S-07) |
| `elyk-btn-gold` | Gold plein | Dashboard, panier, catalogue, confirmations |

Ne pas utiliser gold partout par défaut — vérifier la maquette.

## Champs formulaire

- **Auth, paiement** : `app-elyk-outlined-field` (label flottant, icône gold, bordure)
- **Autres** : `ion-input` standard acceptable si la maquette le montre

Wizard auth multi-étapes : téléphone local (sans `+228` visible) → PIN ou OTP+PIN.

## Patterns par écran (résumé)

| # | Points clés visuels |
|---|---------------------|
| S-02 Auth | Type A, `decor=ribbons`, overlap card, titre Playfair, bouton navy, footer hint |
| S-03 Dashboard | Type A, `decor=grid`, profil dans header, carte crédit overlap, actions gold |
| S-04–S-06 | Type B, listes/cartes `.elyk-card`, pastilles recouvrement |
| S-07–S-11 | Type B (sauf overlap si maquette), boutons gold |

Détail complet : [design-system.md](design-system.md) + [screens.md](screens.md).

### Pastilles recouvrement (S-06)

- VALIDÉ → `#22C55E` · INITIÉ → `#F97316` · RETARD → `#EF4444` · RESTANT → `#D1D5DB`

### États

- Chargement : `ion-spinner.center-spinner`
- Vide : `.empty-state`
- Erreur champ : prop `error` sur `elyk-outlined-field`

### Safe areas Capacitor

```scss
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

## Anti-patterns

- Inventer un layout sans passer par Type A ou B
- Header décoratif recréé en SCSS local au lieu de `app-elyk-decor-header`
- Inputs fond gris sur auth (maquette = outlined)
- Bouton gold systématique sans vérifier la maquette
- Palette / composants du back-office (`frontend-ui-style`, Material)
- Couleurs Ionic par défaut non surchargées
- Styles inline (`style="..."`)
- Indicatif `+228` visible dans le champ téléphone
- Stocker `+228` dans le username ou les appels API métier

## Checklist avant livraison

```
- [ ] Maquette PNG S-XX consultée pendant l'implémentation
- [ ] Archétype A ou B conforme à design-system.md
- [ ] Composants shared/ui utilisés (header, overlap, outlined si formulaire)
- [ ] Variant bouton correct (navy vs gold)
- [ ] Tokens --elyk-* (pas de couleurs ad hoc)
- [ ] Playfair uniquement sur titres émotionnels / montants
- [ ] ion-content fond cream, cartes blanches radius 16–20px
- [ ] Responsive 360–430px
- [ ] États chargement et vide présents
- [ ] Safe areas Capacitor
```
