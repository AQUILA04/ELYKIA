# Plan de Migration Angular 14 → Angular 18

## État Actuel du Projet
- **Angular 14.2.x** avec architecture NgModule traditionnelle
- **90+ composants** déclarés dans AppModule
- **Angular Material 14.2.7** + **ngx-permissions** + **ngx-toastr**
- **RxJS ~7.5.0**, **TypeScript ~4.8.4**, **Karma/Jasmine**
- **Lazy loading** déjà configuré pour les modules fonctionnels

---

## Stratégie de Migration (Incrémentale)

### 📦 Phase 1 : Angular 14 → 15 (Migration de Base)

**Breaking Changes Angular 15 :**
- Suppression définitive de **ngcc** et du legacy Angular Package Format
- `@angular/compiler-cli` requiert TypeScript 4.8+
- `loadChildren` string syntax dépréciée (déjà pas utilisée dans votre cas)

**Actions :**
```bash
cd frontend/
ng update @angular/core @angular/cli @angular/material @angular/cdk
```

**Points d'attention :**
- Vérifier la compatibilité de `ngx-permissions@15` (déjà installé)
- `ngx-toastr@15` compatible Angular 15
- Mettre à jour `angular.json` : remplacer `browser` builder par `browser-esbuild` (optionnel) ou garder le nouveau `application` builder

---

### 🚀 Phase 2 : Angular 15 → 16 (Standalone Components)

**Nouveautés Angular 16 :**
- **Standalone Components** (stable)
- **Signals** (developer preview)
- Nouveau **hydration** pour SSR
- Requiert TypeScript 4.9.3+

**Actions :**
```bash
ng update @angular/core @angular/cli @angular/material @angular/cdk
```

**Migration progressive vers Standalone :**
1. Créer `app.config.ts` avec `provideHttpClient()`, `provideRouter()`, `provideAnimationsAsync()`
2. Migrer **AuthModule** en standalone (petit module, peu de dépendances)
3. Migrer les **Feature Modules** un par un (Tontine, Expense, Orders, etc.)
4. Remplacer `bootstrapModule` par `bootstrapApplication` dans `main.ts`

**Exemple de migration :**
```typescript
// Avant (app.module.ts)
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, ...],
  bootstrap: [AppComponent]
})
export class AppModule { }

// Après (main.ts avec standalone)
bootstrapApplication(AppComponent, appConfig);
```

---

### ⚡ Phase 3 : Angular 16 → 17 (Signals & Nouveau Control Flow)

**Nouveautés Angular 17 :**
- **Signals** (stable)
- **Nouveau Control Flow** (`@if`, `@for`, `@switch`)
- **Déférrable Views** (`@defer`)
- **Suppression de TestBed** dépréciations
- Requiert TypeScript 5.2+

**Actions :**
```bash
ng update @angular/core @angular/cli @angular/material @angular/cdk
```

**Migrations recommandées :**
1. Remplacer `*ngIf`, `*ngFor`, `*ngSwitch` par le nouveau syntaxe `@if`, `@for`, `@switch`
2. Convertir certains services vers **Signals** pour l'état local
3. Migrer vers le nouveau **@angular/build** (remplace @angular-devkit/build-angular)

**Exemple :**
```html
<!-- Avant -->
<div *ngIf="isVisible">Content</div>
<ul>
  <li *ngFor="let item of items">{{ item.name }}</li>
</ul>

<!-- Après -->
@if (isVisible) {
  <div>Content</div>
}
@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}
```

---

### 🎯 Phase 4 : Angular 17 → 18 (Dernières Optimisations)

**Nouveautés Angular 18 :**
- **Zoneless change detection** (developer preview)
- **Material 3** support complet
- **Deferrable views** améliorées
- **TypeScript 5.4+** support

**Actions :**
```bash
ng update @angular/core @angular/cli @angular/material @angular/cdk
```

**Optimisations finales :**
1. Évaluer la migration vers **zoneless** (supprime zone.js)
2. Migrer vers **Angular Material 3** si désiré
3. Mettre à jour `ngx-google-analytics` vers version compatible
4. Vérifier compatibilité `ng2-charts`, `ng-apexcharts`, `sweetalert2`

---

## 📋 Plan de Migration Détaillé par Étapes

### Étape 1 : Préparation (Avant migration)
- [ ] Créer une branche dédiée : `git checkout -b feat/angular-18-migration`
- [ ] Sauvegarder `package.json` actuel
- [ ] Nettoyer les dépendances inutilisées : `npm prune`
- [ ] Corriger tous les warnings TypeScript et lint

### Étape 2 : Angular 14 → 15
- [ ] `ng update @angular/core@15 @angular/cli@15`
- [ ] `ng update @angular/material@15 @angular/cdk@15`
- [ ] Mettre à jour TypeScript vers 4.9.x
- [ ] Vérifier que `ng serve` et `ng build` fonctionnent
- [ ] Tester les fonctionnalités critiques (login, navigation, forms)

### Étape 3 : Angular 15 → 16
- [ ] `ng update @angular/core@16 @angular/cli@16`
- [ ] Créer `src/app/app.config.ts` avec les providers
- [ ] Migrer progressivement vers Standalone Components :
  - D'abord : Modules simples (Auth, License)
  - Ensuite : Feature modules (Tontine, Expense, Orders, etc.)
  - Enfin : Shared modules
- [ ] Mettre à jour `main.ts` pour utiliser `bootstrapApplication`
- [ ] Supprimer les NgModules devenus obsolètes

### Étape 4 : Angular 16 → 17
- [ ] `ng update @angular/core@17 @angular/cli@17`
- [ ] Migrer le control flow dans les templates :
  - Remplacer `*ngIf` par `@if`
  - Remplacer `*ngFor` par `@for`
  - Remplacer `*ngSwitch` par `@switch`
- [ ] Utiliser `ng generate @angular/core:control-flow` pour automatiser
- [ ] Convertir certains services vers Signals (optionnel)
- [ ] Migrer vers `@angular/build` dans `angular.json`

### Étape 5 : Angular 17 → 18
- [ ] `ng update @angular/core@18 @angular/cli@18`
- [ ] `ng update @angular/material@18 @angular/cdk@18`
- [ ] Mettre à jour TypeScript vers 5.4+
- [ ] Évaluer et tester le **zoneless** mode (optionnel)
- [ ] Migrer vers Material 3 (optionnel)
- [ ] Vérifier toutes les dépendances tierces

### Étape 6 : Tests et Finalisation
- [ ] Exécuter tous les tests : `ng test`
- [ ] Vérifier le build de production : `ng build --configuration production`
- [ ] Tester manuellement toutes les routes lazy-loaded
- [ ] Vérifier les performances (bundle size, Lighthouse)
- [ ] Créer un PR avec la migration complète

---

## ⚠️ Points de Vigilance

| Dépendance | Action Requise |
|------------|----------------|
| `ngx-permissions` | Vérifier compatibilité Angular 16+ (v16+ disponible) |
| `ngx-toastr` | Migrer vers version 17+ |
| `ngx-google-analytics` | Migrer vers version 18+ ou remplacer par `ngx-google-tag-manager` |
| `ng-apexcharts` / `apexcharts` | Vérifier compatibilité Angular 17+ |
| `ng2-charts` / `chart.js` | Migrer vers versions compatibles |
| `sweetalert2` | Généralement compatible (pas de dépendance Angular directe) |
| `moment` | ⚠️ **Déprécié** - Considérer migration vers `date-fns` ou `dayjs` |
| Karma/Jasmine | ⚠️ **Déprécié** - Considérer migration vers **Jest** |

---

## 🔧 Commandes Utiles

```bash
# Vérifier les versions installées
ng version

# Mise à jour Angular (étape par étape)
ng update @angular/core@15 @angular/cli@15 --force
ng update @angular/material@15 @angular/cdk@15 --force

# Migration automatique des syntaxes
ng generate @angular/core:control-flow

# Vérifier le bundle size
ng build --stats-json
npx webpack-bundle-analyzer dist/frontend/stats.json

# Tests
ng test --watch=false --browsers=ChromeHeadless
```

---

## 📊 Résumé du Temps Estimé

- **Phase 1 (14→15)** : 2-4 heures
- **Phase 2 (15→16 + Standalone)** : 1-2 jours (selon nombre de modules)
- **Phase 3 (16→17 + Control Flow)** : 1 jour
- **Phase 4 (17→18)** : 2-4 heures
- **Tests et correction** : 1-2 jours

**Total estimé : 4-7 jours** (selon la complexité des modules et les problèmes rencontrés)
