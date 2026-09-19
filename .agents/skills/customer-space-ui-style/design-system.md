# Design system — Espace Client ELYKIA

Référence technique pour **tous** les écrans `customer-space/`. À lire avant toute page visible.

## Deux archétypes de page

| Type | Quand l'utiliser | Header | Contenu |
|------|------------------|--------|---------|
| **A — Decor** | Écrans « vitrine » premium (auth, dashboard, accueil crédit) | `app-elyk-decor-header` + motif SVG | `app-elyk-overlap-card` ou `.page-inner` sous header |
| **B — Plain** | Listes, détails, formulaires secondaires | `ion-header` + `elyk-toolbar-plain` | `.page-inner` classique |

**Règle :** ne jamais inventer un 3ᵉ layout. Choisir A ou B selon la maquette PNG.

## Composants obligatoires (`shared/ui/`)

```typescript
import {
  ElykDecorHeaderComponent,
  ElykOverlapCardComponent,
  ElykOutlinedFieldComponent,
} from '../../shared/ui';
```

### `app-elyk-decor-header`

| Input | Valeurs | Usage |
|-------|---------|-------|
| `decor` | `ribbons` \| `grid` | Rubans = auth ; grille = dashboard |
| `title` | string | Titre barre (blanc, centré) |
| `showBack` | boolean | Bouton retour circulaire |
| `compact` | boolean | Header moins haut |

Assets : `assets/decor/header-ribbons.svg`, `assets/decor/header-grid.svg`

```html
<app-elyk-decor-header decor="grid" title="Accueil">
  <!-- slot optionnel : profil, avatar (dashboard S-03) -->
  <div class="profile-row">…</div>
</app-elyk-decor-header>
```

### `app-elyk-overlap-card`

Carte blanche avec `margin-top: var(--elyk-card-overlap)` — chevauche le header décoratif.

```html
<app-elyk-overlap-card>
  <h2 class="elyk-title-serif">Bon retour !</h2>
  <p class="elyk-subtitle">Connectez-vous à votre espace</p>
  …
</app-elyk-overlap-card>
```

### `app-elyk-outlined-field`

Champ outlined, label flottant, icône gold. Projeter `ion-input` à l'intérieur.

```html
<app-elyk-outlined-field label="Numéro de téléphone" icon="call-outline">
  <ion-input formControlName="phone" type="tel"></ion-input>
</app-elyk-outlined-field>
```

## Boutons (classes globales)

| Classe | Maquette | Écrans typiques |
|--------|----------|-----------------|
| `elyk-btn-navy` | Navy + bordure gold | Auth « Se connecter », actions principales sur fond clair |
| `elyk-btn-gold` / `elyk-btn-primary` | Gold plein | Dashboard, panier, CTA secondaires |
| `elyk-btn-outline` | Contour gris | Annuler, actions tertiaires |

```html
<ion-button expand="block" class="elyk-btn-navy">Se connecter</ion-button>
```

## Mapping maquette → archétype → composants

| # | Écran | Type | `decor` | Overlap card | Bouton principal | Champs |
|---|-------|------|---------|--------------|------------------|--------|
| S-01 | Splash | A (full bleed) | ribbons | non | — | — |
| S-02 | Connexion | A | ribbons | oui | navy | outlined |
| S-03 | Dashboard | A | grid | oui (crédit) | gold (actions) | — |
| S-04 | Historique achats | B | — | non | — | — |
| S-05 | Détail achat | B | — | non | gold | — |
| S-06 | Timeline recouvrement | B | — | non | — | — |
| S-07 | Paiement | B ou A | ribbons | optionnel | navy | outlined |
| S-08 | Paiement confirmé | B | — | non | gold | — |
| S-09 | Catalogue | B | — | non | gold | — |
| S-10 | Panier | B | — | non | gold | — |
| S-11 | Commande confirmée | B | — | non | gold | — |

## Structure HTML Type A (modèle)

```html
<ion-content class="elyk-page-decor">
  <app-elyk-decor-header
    [decor]="'ribbons'"
    [title]="'Connexion'"
    [showBack]="showBack"
    (back)="goBack()">
  </app-elyk-decor-header>

  <div class="elyk-page-decor__body">
    <app-elyk-overlap-card>
      <h2 class="elyk-title-serif">Titre émotionnel</h2>
      <p class="elyk-subtitle">Sous-titre</p>
      <!-- formulaire -->
    </app-elyk-overlap-card>

    <p class="elyk-page-footer-hint">Texte pied de page</p>
  </div>
</ion-content>
```

## Structure HTML Type B (modèle)

```html
<ion-header class="ion-no-border">
  <ion-toolbar class="elyk-toolbar-plain">
    <ion-buttons slot="start">
      <ion-back-button defaultHref="/dashboard"></ion-back-button>
    </ion-buttons>
    <ion-title>Titre page</ion-title>
  </ion-toolbar>
</ion-header>
<ion-content class="page-content">
  <div class="page-inner">…</div>
</ion-content>
```

## Typographie

| Rôle | Police | Classe utilitaire |
|------|--------|-------------------|
| Titres émotionnels, montants | Playfair Display 700 | `.elyk-title-serif` |
| UI, labels, boutons | DM Sans 400–600 | (défaut body) |
| Sous-titres, hints | DM Sans 13px gris | `.elyk-subtitle` |

## Anti-patterns visuels

- Layout centré « logo ELYKIA + carte » sans header décoratif (sauf splash S-01)
- Inputs fond gris rempli (`--elyk-gray-bg`) sur écrans auth/paiement → utiliser `elyk-outlined-field`
- Bouton gold sur écran où la maquette montre navy+bordure gold
- Couleurs hex en dur dans les composants feature → tokens `--elyk-*`
- Recréer les motifs en CSS → utiliser les SVG `assets/decor/`
- `style="..."` inline

## Checklist fidélité (chaque écran)

```
- [ ] Maquette PNG S-XX ouverte pendant l'implémentation
- [ ] Archétype A ou B choisi selon tableau ci-dessus
- [ ] Composants shared/ui utilisés (pas de copier-coller SCSS header)
- [ ] Variant bouton correct (navy vs gold)
- [ ] Typo Playfair sur titres émotionnels uniquement
- [ ] Tokens --elyk-* (pas de couleurs ad hoc)
- [ ] Safe areas Capacitor
- [ ] États chargement / vide / erreur
- [ ] Responsive 360–430px
```
