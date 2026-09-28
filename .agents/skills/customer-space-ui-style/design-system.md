# Design system — Espace Client ELYKIA

Référence technique pour **tous** les écrans `customer-space/`. À lire avant toute page visible.

## Trois archétypes de page

| Type | Quand l'utiliser | Header | Contenu |
|------|------------------|--------|---------|
| **A — Decor** | Écrans « vitrine » déjà maquettés (auth, dashboard) | `app-elyk-decor-header` + motif SVG | `app-elyk-overlap-card` ou `.page-inner` sous header |
| **B — Plain** | Écrans wireflow S-04–S-11 déjà en Type B | `ion-header` + `elyk-toolbar-plain` | `.page-inner` classique |
| **C — Hero header (v2, défaut)** | **Toute nouvelle page** ou refonte d’un écran pas encore migré | `app-elyk-page-header` (navy + grille, eyebrow gold, titre Playfair, coins bas arrondis) | Première carte qui chevauche le header ; classes `.elyk-chip`, `.elyk-steps`, `.elyk-progress` ; CTA formulaire en `ion-footer` |

**Règle :** ne pas inventer un layout hors A/B/C. **Type C est le défaut** dès qu’on touche une page qui n’a pas encore ce design system (ex. tontine déjà migré ; appliquer C automatiquement aux prochaines pages non migrées).

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

### `app-elyk-page-header` — Type C (v2, défaut)

Hero navy avec motif `header-grid.svg`, coins bas arrondis (`--elyk-header-radius`), eyebrow uppercase gold, titre Playfair et sous-titre.

| Input | Usage |
|-------|-------|
| `eyebrow` | Ex. « ESPACE TONTINE » |
| `title` | Titre émotionnel Playfair |
| `subtitle` | Phrase de soutien |
| `showBack` | Bouton retour circulaire |

```html
<app-elyk-page-header
  eyebrow="ESPACE TONTINE"
  title="Mes tontines"
  subtitle="Épargnez un peu chaque jour, recevez vos vivres en fin d'année">
</app-elyk-page-header>
```

Tokens v2 associés : `--elyk-space-*`, `--elyk-text-*`, `--elyk-gold-soft`, `--elyk-green-soft`, `--elyk-surface-muted`, `--elyk-shadow-soft`.

**CTA de formulaire (Type C) :** placer le bouton principal dans un `ion-footer` (hors `ion-content`) pour éviter le saut au focus clavier. Réserver `.elyk-sticky-cta` aux listes sans champs texte.

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

## Structure HTML Type C (modèle)

```html
<ion-content class="page-content my-page">
  <app-elyk-page-header
    eyebrow="ESPACE …"
    title="Titre"
    subtitle="Sous-titre"
    [showBack]="true"
    (back)="goBack()">
  </app-elyk-page-header>

  <div class="page-body">
    <!-- première carte chevauche le header (margin-top négatif) -->
  </div>
</ion-content>

<ion-footer class="ion-no-border" *ngIf="showCta">
  <div class="footer-inner">
    <ion-button expand="block" class="elyk-btn-gold" (click)="submit()">Confirmer</ion-button>
  </div>
</ion-footer>
```

## Checklist fidélité (chaque écran)

```
- [ ] Maquette PNG S-XX ouverte si elle existe ; sinon Type C par défaut
- [ ] Archétype A, B ou C choisi selon tableau ci-dessus
- [ ] Composants shared/ui utilisés (pas de copier-coller SCSS header)
- [ ] Formulaire + clavier → CTA en ion-footer
- [ ] Variant bouton correct (navy vs gold)
- [ ] Typo Playfair sur titres émotionnels uniquement
- [ ] Tokens --elyk-* (pas de couleurs ad hoc)
- [ ] Safe areas Capacitor
- [ ] États chargement / vide / erreur
- [ ] Responsive 360–430px
```
