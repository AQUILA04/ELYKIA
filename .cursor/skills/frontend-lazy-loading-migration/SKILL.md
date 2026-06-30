---
name: frontend-lazy-loading-migration
description: >
  Règle de migration progressive lazy-loading du frontend ELYKIA (Angular).
  À appliquer systématiquement pour toute tâche touchant le frontend
  (frontend/, composants, services, routing, modules). Si le travail concerne
  un domaine encore eager sous frontend/src/app/, migrer ce domaine vers
  loadChildren et aligner les URLs sur /{domaine}/... ; sinon vérifier et ne
  rien migrer. Un seul domaine par tâche, sans toucher aux autres dossiers.
---

# Migration progressive lazy-loading — Frontend ELYKIA

## Activation automatique

Ce skill est **proposé automatiquement** dès qu'une tâche touche `frontend/` (règle Cursor `.cursor/rules/frontend-lazy-loading-migration.mdc`, globs `frontend/**`). Il doit être **lu et pris en compte** même si la demande utilisateur ne mentionne pas le lazy-loading.

| Situation | Action |
|-----------|--------|
| Tâche frontend + domaine **eager** touché | Lire ce skill **et** exécuter la migration du domaine concerné |
| Tâche frontend + domaine **déjà lazy-loaded** uniquement | Lire ce skill, confirmer qu'aucune migration n'est requise, poursuivre la tâche |
| Tâche frontend transverse (`shared/`, `layout/`, guards…) | Lire ce skill, ne migrer aucun domaine |
| Tâche backend / mobile / docs seuls | Ne pas appliquer |

## Principe

Pour les agents travaillant sur le projet ELYKIA, frontend, il faut qu'il adopte une migration progressiste des domain vers un lazy-loading car tous les dossier dans app ne sont pas lazy-loaded actuellement, par exemple si un agent doit faire une tache qui tocuhe un fichier dans le dossier 'credit' alors il profite pour mettre à niveau vers le lazy-loading, il ne touche pas aux autres dossier qui ne fait pas partie de son travail. prochainement s'il touche un fichier de client, il met client aussi à niveau, Comme ça après une periode on fera de façon progressive la migration.

## Quand migrer (après lecture du skill)

| Appliquer la migration | Ne pas migrer |
|-----------|------------------|
| Tâche touchant un fichier dans un **domaine eager** (ex. `credit/`, `client/`) | Domaine **déjà lazy-loaded** (voir liste ci-dessous) |
| Création ou modification de pages/composants d'un domaine | `shared/`, `layout/`, `interceptors/`, `guards/`, `services/` transverses |
| Refactor ou feature dans un dossier domaine | Tâche purement backend ou tests sans toucher le routing |

**Règle d'or** : migrer **un seul domaine** par PR/tâche — celui que vous modifiez. Ne jamais migrer plusieurs domaines « tant qu'on y est ».

## État actuel

### Déjà lazy-loaded (`loadChildren` dans `app-routing.module.ts`)

`orders`, `bi`, `ai-chat`, `tontine`, `stock`, `stock-tontine`, `article-type`, `expense`, `security`

### Encore eager (déclarés dans `app.module.ts`)

`article`, `locality`, `account`, `client`, `dashboard`, `accounting-day`, `credit`, `user`, `cash-desk`, `inventory`, `gestion`, `operation`, `deposit`, `report`, `history`, `out`, `commercial`, `parameters`, `auth` (login — laisser eager sauf demande explicite)

> Vérifier `app-routing.module.ts` et `app.module.ts` avant migration : l'état peut avoir évolué.

## Modules de référence

| Pattern | Fichiers |
|---------|----------|
| Feature module complet | [expense.module.ts](frontend/src/app/expense/expense.module.ts) |
| Routing enfant | [expense-routing.module.ts](frontend/src/app/expense/expense-routing.module.ts) |
| Guards + permissions | [app-routing — orders](frontend/src/app/app-routing.module.ts) (l.93–103) |
| Module plus riche (shared) | [orders.module.ts](frontend/src/app/orders/orders.module.ts) |

## Workflow de migration (domaine touché uniquement)

### 1. Identifier le périmètre

- Lister **tous** les composants du domaine déclarés dans `app.module.ts`
- Lister **toutes** les routes du domaine dans `app-routing.module.ts`
- Lister les `routerLink` / `router.navigate` **dans ce domaine** + sidebar si le domaine y figure

### 2. Créer le feature module

```
frontend/src/app/{domaine}/
  {domaine}.module.ts
  {domaine}-routing.module.ts
```

- Déplacer les `declarations` du domaine depuis `app.module.ts` vers `{domaine}.module.ts`
- Importer `CommonModule`, `FormsModule`, `ReactiveFormsModule`, modules Material utilisés
- Importer `SharedComponentsModule` si le domaine utilise des composants partagés
- **Ne pas** importer le feature module dans `AppModule`

### 3. Routing enfant

Dans `{domaine}-routing.module.ts` :

```typescript
const routes: Routes = [
  { path: 'list', component: XxxListComponent },
  { path: 'add', component: XxxAddComponent },
  // ... toutes les routes du domaine
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class XxxRoutingModule { }
```

### 4. Préfixe de domaine et nouvelles URLs

Suivre le pattern `orders` / `expense` / `security` : préfixe unique dans `app-routing` :

```typescript
{
  path: 'credit',
  loadChildren: () => import('./credit/credit.module').then(m => m.CreditModule),
  canActivate: [AuthGuard] // reprendre guards/permissions/data de l'ancienne route
}
```

**Mettre à jour les URLs** pour qu'elles correspondent au chemin lazy-loaded (`/{domaine}/{segment}`) :

| Ancienne URL (eager) | Nouvelle URL (lazy) |
|----------------------|---------------------|
| `/credit-list` | `/credit/list` |
| `/credit-add` | `/credit/add` |
| `/credit-add/:id` | `/credit/add/:id` |
| `/client-list` | `/client/list` |

Conventions de segments : `list`, `add`, `edit/:id`, `details/:id` — comme `expense` et `orders`.

**Mettre à jour tous les liens du domaine migré** :

- `routerLink` et `router.navigate` dans les composants du domaine
- Entrées sidebar dans `layout/sidebar/` si le domaine y figure
- Références croisées **depuis d'autres domaines** qui pointent vers ce domaine (grep le nom du domaine dans `frontend/src/app/`)
- Tests E2E ou specs qui utilisent les anciennes URLs

**Ne pas** ajouter de redirects `credit-list` → `credit/list` : les anciennes URLs sont remplacées, pas conservées.

### 5. Nettoyer AppModule / AppRouting

- Retirer les `import` et `declarations` du domaine dans `app.module.ts`
- Remplacer les routes `component:` du domaine par un seul `loadChildren` sur le préfixe
- Supprimer les anciennes routes eager du domaine (pas de redirects)
- Retirer les imports de composants du domaine en tête de `app-routing.module.ts`

### 6. Vérifier

- [ ] Build : `npm run build` dans `frontend/`
- [ ] Navigation sidebar + liens internes du domaine
- [ ] Guards et `data.permissions` inchangés
- [ ] Aucun autre domaine eager modifié
- [ ] Mettre à jour `docs/CHANGELOG.md` (skill `keep-changelog`)

## Exemples

### Tâche sur `credit/credit-list/` → migrer `credit` uniquement

1. Créer `credit.module.ts` + `credit-routing.module.ts`
2. Y déplacer tous les composants `credit/*` + sous-composants (`credit-late`, `recouvrement`, etc.)
3. `path: 'credit'` + `loadChildren` ; routes enfants `list`, `add`, `late`, etc.
4. Mettre à jour URLs : `/credit-list` → `/credit/list`, sidebar, navigations internes
5. Ne **pas** toucher `client/`, `article/`, etc.

### Tâche ultérieure sur `client/client-add/` → migrer `client` uniquement

Même procédure pour `client` indépendamment. `credit` reste lazy-loaded, pas de re-migration.

### Tâche sur `expense/pages/list/` → rien à migrer

`expense` est déjà lazy-loaded : modifier le fichier sans toucher au routing global.

## Anti-patterns

- Migrer plusieurs domaines dans une même tâche
- Laisser des composants du domaine dans `app.module.ts` après migration
- Laisser des anciennes URLs (`/credit-list`) après migration sans les mettre à jour
- Ajouter des redirects de rétrocompatibilité (les URLs doivent suivre le préfixe lazy-loaded)
- Importer le feature module dans `AppModule` (annule le lazy-loading)
- Refactoriser le routing d'un domaine non concerné par la tâche

## Convention URLs (référence rapide)

Pattern cible : `/{domaine}/{action}` — aligné sur [expense-routing.module.ts](frontend/src/app/expense/expense-routing.module.ts).

```typescript
// credit-routing.module.ts (exemple)
const routes: Routes = [
  { path: 'list', component: CreditListComponent },
  { path: 'add', component: CreditAddComponent },
  { path: 'add/:id', component: CreditAddComponent },
  { path: 'late', component: CreditLateComponent },
  { path: 'details/:id', component: CreditDetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];
```

Routes imbriquées existantes (`credits/late`) → aplatir sous le préfixe : `/credit/late`, `/credit/echeance`, `/credit/recouvrements`.
