---
name: frontend-ui-style
description: >
  Impose le style UI standard du frontend ELYKIA (pages liste/tableau) pour toute
  tâche touchant l'interface Angular : nouvelles pages, refontes HTML/SCSS, composants
  de liste, filtres, KPIs, tableaux, états vides. À appliquer systématiquement avant
  de livrer du travail frontend visible par l'utilisateur.
---

# Style UI Frontend ELYKIA

## Quand appliquer ce skill

- Création ou modification d'une **page Angular** avec contenu visible (liste, rapport, dashboard section)
- Refonte HTML/SCSS d'un écran existant
- Ajout de KPIs, barre d'outils, tableau de données ou état vide
- **Ne pas** l'appliquer pour : logique pure TS sans UI, services, guards, tests unitaires seuls

## Pages de référence (lire avant d'implémenter)

| Référence | Fichier |
|-----------|---------|
| Liste avec KPI + toolbar + tableau | [client-list.component.html](frontend/src/app/client/client-list/client-list.component.html) |
| Persistance recherche + pagination | [client-list.component.ts](frontend/src/app/client/client-list/client-list.component.ts) |
| Page avec header + KPI enfants | [credit-late.component.html](frontend/src/app/credit/credit-late/credit-late.component.html) |
| Styles complets (variables, animations) | [credit-late.component.scss](frontend/src/app/credit/credit-late/credit-late.component.scss) |
| Rapports mensuels (exemple récent) | [monthly-reports.component.html](frontend/src/app/report/pages/monthly-reports/monthly-reports.component.html) |

## Structure HTML obligatoire

Toute page liste/rapport suit cet ordre :

```
.main-container.{page-class}.a1
  .breadcrumb-bar
    a.breadcrumb-link → Tableau de bord
    span.date-display (horloge live)
  .page-header-card.a2
    .header-card-top → .header-surtitle + .last-update
    .header-card-main → .title-group (svg.page-icon + h1.page-title) + button.btn-refresh
    p.page-subtitle
  .kpi-strip.a3 (si métriques pertinentes)
    .kpi-card.kpi-total | .kpi-amount | .kpi-green | .kpi-delai
  .toolbar.a4 (filtres / actions)
  .table-card.a5
    .table-wrapper
      état chargement / vide / contenu
```

Classes d'animation : `.a1` à `.a5` (fadeUp échelonné).

## Palette et variables CSS

Déclarer en tête du SCSS du composant (préfixe page, ex. `.client-page`, `.monthly-reports-page`) :

| Token | Valeur |
|-------|--------|
| `--navy` | `#003366` |
| `--navy-dark` | `#002244` |
| `--navy-pale` | `#e8eef6` |
| `--navy-xpale` | `#f0f4f9` |
| `--bg-page` | `#f2f4f8` |
| `--bg-white` | `#ffffff` |
| `--border` | `#dde3ec` |
| `--text-muted` | `#6b7a99` |
| `--text-light` | `#9aacc4` |
| `--green` | `#1d8a3c` |
| `--orange` | `#c75000` |
| `--kpi-cyan` | `#0095c8` |
| `--radius` | `12px` |
| `--radius-sm` | `8px` |

**Interdit** : boutons Material bruts (`mat-raised-button`, `mat-stroked-button`) sur les pages liste — utiliser `.btn-refresh`, `.btn-primary`, `.btn-download`, `.btn-detail`, `.btn-clear`.

## Typographie

- Police principale : **Inter**
- Chiffres / dates mono : **DM Mono**
- Sur-titre : 11px, uppercase, letter-spacing `.1em`, `--text-light`
- Titre page : 22px, font-weight 800, `--navy`, `line-height: 1`, **margin/padding 0**
- Sous-titre : 13px, `--text-muted`

## KPI strip

- Grille 4 colonnes (`repeat(4, 1fr)`), gap 14px
- Carte blanche, bordure, ombre légère
- Bande colorée gauche 4px via `::before` :
  - `.kpi-total` → navy
  - `.kpi-amount` → cyan
  - `.kpi-green` → green
  - `.kpi-delai` → orange
- Valeur : DM Mono 24px bold, couleur assortie à la bande

## Toolbar

- Fond blanc, bordure, padding 14px 20px
- Labels `.toolbar-label` en uppercase
- Compteur `.result-count` aligné à droite (`margin-left: auto`)
- Actions primaires : `.btn-download` ou `.btn-primary` (fond navy)

## Tableau

- Conteneur `.table-card` > `.table-wrapper`
- Table `.data-table` : en-têtes uppercase navy sur fond `--navy-xpale`
- Lignes hover : fond `--navy-xpale`
- Actions ligne : `.btn-detail` (pas de mat-icon-button seul)
- État vide : `.empty-state` avec `.empty-icon`, `.empty-title`, `.empty-sub`
- Chargement : même pattern empty-state avec icône ⏳

## Encapsulation Angular

Pour les pages avec styles partagés (sous-composants, table enfants) :

```typescript
encapsulation: ViewEncapsulation.None,
standalone: false
```

Tous les sélecteurs SCSS **doivent être préfixés** par la classe page (`.monthly-reports-page`, `.client-page`) pour éviter les fuites globales.

## Comportement TypeScript attendu

- `currentDate` mis à jour chaque seconde (`setInterval`, nettoyé dans `ngOnDestroy`)
- `lastUpdate` rafraîchi à chaque chargement de données
- Bouton **Actualiser** appelle la même méthode que le chargement initial
- États `loading` / `empty` gérés explicitement dans le template

## Persistance de l'état liste (obligatoire)

Toute page liste avec **recherche**, **filtres** ou **pagination** doit conserver son état quand l'utilisateur quitte la page (formulaire, détail, autre route) puis revient.

**Référence** : `client-list.component.ts` (`saveState` / `restoreState` via `sessionStorage`).

### À persister au minimum

- Terme de recherche (`searchTerm` / `search`)
- Index de page (`currentPage` / `pageIndex` / `page`)
- Taille de page (`pageSize` / `size`)
- Filtres actifs (commercial, période, statut, etc. si présents)

### Implémentation standard

```typescript
private readonly STATE_KEY = 'maListeState';

interface MaListeState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

ngOnInit(): void {
  this.restoreState();
  this.loadData();
}

ngOnDestroy(): void {
  this.saveState();
}

// Appeler saveState() :
// - après chargement réussi
// - sur changement de page / recherche / filtre
// - avant router.navigate() vers formulaire ou détail
```

- Clé `STATE_KEY` unique par liste (ex. `localityListState`, `inventoryListState`)
- `restoreState()` dans `ngOnInit()` **avant** le premier chargement
- `saveState()` dans `ngOnDestroy()` et avant toute navigation sortante
- Mentionner la persistance dans le `page-subtitle` si pertinent (ex. « Recherche et pagination conservées à la navigation »)

## Checklist avant livraison

```
- [ ] Structure breadcrumb + header-card + (kpi) + toolbar + table-card
- [ ] Pas de mat-button Material sur actions principales
- [ ] Variables palette navy déclarées, pas de couleurs ad hoc
- [ ] Titre h1 sans marge parasite (margin: 0 !important)
- [ ] Animations a1–a5 présentes
- [ ] États chargement et vide conformes
- [ ] Responsive : kpi 2 colonnes < 900px, header empilé < 600px
- [ ] SCSS préfixé si ViewEncapsulation.None
- [ ] Référence visuelle comparée à client-list ou credit-late
- [ ] Recherche, filtres et pagination persistés (`sessionStorage`, `saveState` / `restoreState`)
```

## Anti-patterns

- Header minimal (`<h2>` + `mat-button`) sans `page-header-card`
- Accordéon Material non stylé (`mat-accordion` brut)
- Styles inline dans le HTML (`style="..."`)
- Couleur violette / Material primary par défaut
- Dupliquer 800 lignes SCSS sans préfixe page quand `ViewEncapsulation.None`
- Oublier le fil d'Ariane et l'horloge
- Oublier la persistance de l'état liste (recherche / page perdues au retour depuis un formulaire)
