# Corrections Gestion Tontine - Actualisation Automatique

## Problèmes Identifiés

1. **Historique des cotisations non actualisé** : Après l'enregistrement d'une collection, l'historique sur la page de détail du membre ne se mettait pas à jour automatiquement
2. **Liste des membres non actualisée** : Le montant total contribué (totalContribution) ne se mettait pas à jour dans la liste des membres du dashboard
3. **totalContribution non calculé** : Lors de l'enregistrement d'une collection, le champ totalContribution du membre n'était pas recalculé

## Solutions Implémentées

### 1. Mise à jour automatique du totalContribution
**Fichier**: `elykia-mobile/src/app/core/repositories/tontine-collection.repository.ts`

- Ajout d'une méthode `updateMemberTotalContribution()` qui recalcule le total des contributions d'un membre
- Surcharge de la méthode `save()` pour appeler `saveAll()` avec le flag `updateMemberTotal = true`
- Modification de `saveAll()` pour accepter un paramètre optionnel `updateMemberTotal` (par défaut `false`)
- La mise à jour du totalContribution ne se fait que lors de l'enregistrement manuel (via `save()`), pas lors de l'initialisation depuis l'API (via `saveAll()` direct)
- Le totalContribution est maintenant calculé en temps réel via une requête SQL SUM

```typescript
async save(entity: TontineCollection): Promise<void> {
    return this.saveAll([entity], true); // updateMemberTotal = true
}

async saveAll(entities: TontineCollection[], updateMemberTotal: boolean = false): Promise<void> {
    // ... sauvegarde des collections ...
    
    if (updateMemberTotal) {
        const uniqueMemberIds = [...new Set(entities.map(c => c.tontineMemberId))];
        for (const memberId of uniqueMemberIds) {
            await this.updateMemberTotalContribution(memberId);
        }
    }
}

async updateMemberTotalContribution(memberId: string): Promise<void> {
    const updateQuery = `
        UPDATE tontine_members 
        SET totalContribution = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM tontine_collections 
            WHERE tontineMemberId = ?
        )
        WHERE id = ?
    `;
    await this.databaseService.execute(updateQuery, [memberId, memberId]);
}
```

**Important**: Cette approche évite les erreurs de contrainte de clé étrangère lors de l'initialisation, car le totalContribution vient directement de l'API lors du `fetchAndSaveMembers()`, et n'est recalculé que lors de l'enregistrement manuel de nouvelles collections.

### 2. Actualisation de la page de détail du membre
**Fichier**: `elykia-mobile/src/app/features/tontine/pages/member-detail/member-detail.page.ts`

- Ajout du lifecycle hook `ionViewWillEnter()` qui recharge les données du membre à chaque retour sur la page
- Cela garantit que l'historique des cotisations est toujours à jour

```typescript
async ionViewWillEnter() {
    if (this.memberId) {
        await this.loadMemberData();
    }
}
```

### 3. Actualisation du dashboard des membres
**Fichier**: `elykia-mobile/src/app/features/tontine/dashboard/tontine-dashboard.page.ts`

- Ajout du lifecycle hook `ionViewWillEnter()` qui recharge la liste des membres depuis le store
- Ajout de l'import `take` dans les opérateurs RxJS
- Cela garantit que les montants totaux sont à jour dans la liste

```typescript
ionViewWillEnter() {
    this.session$.pipe(
        take(1),
        tap(session => {
            if (session && session.id) {
                this.store.dispatch(loadTontineMembers({ sessionId: session.id }));
            }
        })
    ).subscribe();
}
```

### 4. Correction du flux de navigation après enregistrement
**Fichier**: `elykia-mobile/src/app/features/tontine/pages/collection-recording/collection-recording.page.ts`

- Modification de la gestion du modal de reçu pour attendre sa fermeture avec `await modal.onDidDismiss()`
- Navigation retour uniquement après la fermeture complète du modal
- Cela permet aux hooks `ionViewWillEnter()` de se déclencher correctement

```typescript
await modal.present();
await modal.onDidDismiss();
this.navCtrl.back();
```

## Flux Complet

1. L'utilisateur enregistre une collection sur `collection-recording.page`
2. La collection est sauvegardée via `TontineCollectionRepository.save()` → `saveAll()`
3. `saveAll()` met automatiquement à jour le `totalContribution` du membre dans la base de données
4. Le modal de reçu s'affiche
5. L'utilisateur ferme le modal (impression ou fermeture)
6. Navigation retour vers `member-detail.page`
7. `ionViewWillEnter()` se déclenche et recharge les données du membre (incluant l'historique mis à jour)
8. Si l'utilisateur retourne au dashboard, `ionViewWillEnter()` recharge la liste des membres avec les nouveaux totaux

## Résolution du Problème de Contrainte de Clé Étrangère

**Problème Initial**: Lors de l'initialisation, l'erreur `FOREIGN KEY constraint failed` se produisait car la méthode `saveAll()` tentait de mettre à jour le `totalContribution` des membres avant que ceux-ci ne soient complètement sauvegardés.

**Solution**: 
- Ajout d'un paramètre optionnel `updateMemberTotal` à la méthode `saveAll()` (par défaut `false`)
- Lors de l'initialisation depuis l'API, `saveAll()` est appelé sans ce flag, donc pas de mise à jour du total (qui vient déjà de l'API)
- Lors de l'enregistrement manuel via `save()`, le flag est à `true`, donc le total est recalculé
- Cela évite les conflits de clés étrangères et garantit que les données de l'API sont préservées

## Bénéfices

- ✅ Données toujours synchronisées et à jour
- ✅ Pas besoin de sortir et revenir sur les pages pour voir les changements
- ✅ Expérience utilisateur fluide et cohérente
- ✅ Calcul automatique du totalContribution sans intervention manuelle
- ✅ Pas de risque d'incohérence entre les collections et le total affiché
- ✅ Pas d'erreur de contrainte de clé étrangère lors de l'initialisation
- ✅ Distinction claire entre initialisation (données API) et enregistrement manuel (calcul local)
