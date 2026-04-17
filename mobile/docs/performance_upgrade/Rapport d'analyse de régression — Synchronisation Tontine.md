# Rapport d'analyse de régression — Synchronisation Tontine
## Branche `feature/enhance-and-performace` vs `feature/enhance-sync`

---

## Résumé exécutif

L'analyse comparative approfondie des deux branches révèle **quatre causes de régression distinctes** qui, combinées, produisent les deux symptômes observés :

1. **Le backend n'est jamais appelé** pour synchroniser les membres, collectes et livraisons tontine.
2. **L'ID est affiché à la place du nom du client** dans les onglets Membre, Collecte et Livraison.

---

## Partie I — Pourquoi ça marchait dans `feature/enhance-sync`

### Architecture de la synchronisation (ancienne branche)

Dans `feature/enhance-sync`, toute la logique de synchronisation est centralisée dans un seul service monolithique : `SynchronizationService`. Ce service gère lui-même :

- La récupération des entités non synchronisées via des requêtes SQL directes avec `JOIN clients`.
- La résolution des IDs serveur via `getServerIdForEntity()`.
- L'envoi HTTP au backend.
- Le marquage post-synchronisation.

#### Mécanisme clé : le fallback `|| localId` dans `getServerIdForEntity`

```typescript
// synchronization.service.ts (enhance-sync)
private async getServerIdForEntity(localId: string, entityType: string): Promise<string | null> {
  // ...
  const result = await this.databaseService.query(
    `SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?`,
    [localId, entityType]
  );
  const serverId = result.values?.[0]?.[0] || localId;  // ← FALLBACK CRUCIAL
  // ...
  return serverId;
}
```

**Ce fallback est la clé du fonctionnement.** Lorsqu'un client ou un membre tontine provient du serveur (et n'a donc aucune entrée dans `id_mappings`), la méthode retourne directement son `localId` — qui est déjà l'ID numérique du serveur, puisque les entités serveur sont stockées avec leur ID d'origine.

#### Filtre SQL strict dans `getUnsyncedTontineMembers`

```sql
-- synchronization.service.ts (enhance-sync)
SELECT tm.*, COALESCE(c.fullName, ...) as clientName
FROM tontine_members tm
LEFT JOIN clients c ON tm.clientId = c.id
WHERE tm.isSync = 0 AND tm.isLocal = 1 AND tm.commercialUsername = ?
```

Ce filtre `isLocal = 1` garantit que seuls les membres **créés localement** (jamais envoyés au serveur) sont récupérés pour la synchronisation. Les membres reçus du serveur (`isLocal = 0`) sont traités séparément via `getModifiedTontineMembers()`.

---

## Partie II — Pourquoi ça ne marche plus dans `feature/enhance-and-performace`

La refactorisation a introduit une architecture en services spécialisés (`TontineMemberSyncService`, `TontineCollectionSyncService`, `TontineDeliverySyncService`) héritant d'un `BaseSyncService`. Cette architecture est correcte dans son principe, mais contient **quatre bugs critiques** qui empêchent toute synchronisation.

---

### Bug #1 — `getServerId` sans fallback : blocage systématique pour les entités du serveur

**Fichier :** `mobile/src/app/core/repositories/base.repository.ts`

```typescript
// base.repository.ts (enhance-and-performace)
async getServerId(localId: string, entityType: string): Promise<string | null> {
    if (!localId) return null;
    const result = await this.databaseService.query(
        'SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?',
        [localId, entityType]
    );
    if (result && result.values && result.values.length > 0) {
        return result.values[0].serverId;
    }
    return null;  // ← RETOURNE NULL SI AUCUN MAPPING TROUVÉ
}
```

**Comparaison avec enhance-sync :**

| Comportement | `enhance-sync` | `enhance-and-performace` |
|---|---|---|
| Entité locale (créée sur mobile) | Cherche dans `id_mappings` → trouve le `serverId` | Cherche dans `id_mappings` → trouve le `serverId` |
| Entité serveur (reçue du backend) | Cherche dans `id_mappings` → rien trouvé → **retourne `localId`** (qui EST l'ID serveur) | Cherche dans `id_mappings` → rien trouvé → **retourne `null`** |

**Conséquence directe :** Dans `prepareTontineMemberSyncRequest`, `prepareTontineCollectionSyncRequest` et `prepareTontineDeliverySyncRequest`, lorsque `getServerId` retourne `null`, une exception est levée **avant même l'appel HTTP** :

```typescript
// tontine-member-sync.service.ts
const clientServerId = await this.repository.getServerId(member.clientId, 'client');
if (!clientServerId) {
    throw new Error(`Impossible de trouver l'ID serveur pour le client local ${member.clientId}`);
    // ← L'appel HTTP n'est jamais atteint
}
```

Ceci explique l'erreur "le parent id n'est pas trouvé" que vous observez. Le `clientId` d'un `TontineMember` est l'ID d'un client reçu du serveur — il n'a donc aucune entrée dans `id_mappings`. La solution n'est pas de vérifier si le client existe dans `id_mappings`, mais de vérifier si l'ID est déjà un entier numérique (ID serveur).

---

### Bug #2 — `fetchUnsynced` sans filtre `isLocal = 1` : récupération d'entités non pertinentes

**Fichiers :** `tontine-member-sync.service.ts`, `tontine-collection-sync.service.ts`, `tontine-delivery-sync.service.ts`

```typescript
// fetchUnsynced dans les trois services (enhance-and-performace)
protected override async fetchUnsynced(limit: number): Promise<TontineMember[]> {
    const page = await this.tontineMemberRepositoryExtensions.findByCommercialPaginated(
        commercialUsername, 0, limit,
        { isSync: false }  // ← FILTRE UNIQUEMENT isSync=0, PAS isLocal=1
    );
    return page.content;
}
```

**Comparaison avec enhance-sync :**

```sql
-- enhance-sync : filtre strict
WHERE tm.isSync = 0 AND tm.isLocal = 1 AND tm.commercialUsername = ?

-- enhance-and-performace : filtre insuffisant
WHERE tm.isSync = 0 AND tm.commercialUsername = ?
```

**Conséquence :** La requête retourne **toutes** les entités non synchronisées, y compris celles avec `isLocal = 0` (entités modifiées localement mais originellement du serveur). Ces entités ont un `clientId` qui est l'ID serveur du client, sans entrée dans `id_mappings`, ce qui déclenche le Bug #1.

De plus, le `syncAll()` du `BaseSyncService` utilise `countUnsynced()` qui filtre sur `isSync = 0 AND isLocal = 1` pour calculer le nombre de batches, mais `fetchUnsynced` retourne aussi les entités `isLocal = 0`. Il y a donc une **incohérence entre le comptage et la récupération** qui peut provoquer des boucles infinies ou des arrêts prématurés.

---

### Bug #3 — `isLocal` non converti en boolean dans `findByCommercialPaginated` (sans session)

**Fichier :** `mobile/src/app/core/repositories/tontine-member.repository.extensions.ts`

```typescript
// findByCommercialPaginated (sans session) — enhance-and-performace
const content = (dataResult.values || []) as TontineMember[];
// ← PAS DE CONVERSION isLocal: !!row.isLocal, isSync: !!row.isSync
```

SQLite retourne les booléens sous forme d'entiers (`0` ou `1`). Sans conversion explicite, `isLocal` vaut `1` (truthy) au lieu de `true`, et `isSync` vaut `0` (falsy) au lieu de `false`. Ceci affecte la logique de `syncSingle` dans `TontineMemberSyncService` :

```typescript
async syncSingle(item: TontineMember): Promise<any> {
    if (item.isLocal) {  // ← item.isLocal = 1 (truthy) → branche CREATE
        return this.syncSingleTontineMember(item);
    } else {             // ← item.isLocal = 0 (falsy) → branche UPDATE
        return this.updateSingleTontineMember(item);
    }
}
```

La branche est correctement sélectionnée (car `1` est truthy), mais le problème survient dans `performSingleSync` du `sync.effects.ts` qui utilise `findById` du `BaseRepository`, lequel ne convertit pas non plus les booléens :

```typescript
// base.repository.ts — findById
async findById(id: ID): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.databaseService.query(sql, [id]);
    if (result && result.values && result.values.length > 0) {
        return result.values[0] as T;  // ← isLocal = 1 (integer), pas boolean
    }
    return null;
}
```

**Comparaison :** Dans `enhance-sync`, `mapRowToTontineMember` convertit explicitement tous les booléens. Dans `enhance-and-performace`, cette conversion n'est présente que dans la méthode `findBySessionAndCommercialPaginated` (avec session), mais **absente** de `findByCommercialPaginated` (sans session) et de `findById`.

---

### Bug #4 — `countUnsynced` sans filtre `commercialUsername` : surestimation du nombre de batches

**Fichier :** `mobile/src/app/core/repositories/base.repository.ts`

```typescript
// base.repository.ts
async countUnsynced(): Promise<number> {
    const sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE isSync = 0 AND isLocal = 1`;
    // ← PAS DE FILTRE commercialUsername
}
```

Le `syncAll()` utilise ce comptage pour calculer le nombre d'itérations. Sans filtre par `commercialUsername`, il compte les entités de **tous les commerciaux** présents en base, alors que `fetchUnsynced` ne retourne que celles du commercial connecté. Cela peut provoquer des itérations supplémentaires inutiles ou un arrêt prématuré de la boucle.

---

## Partie III — Tableau récapitulatif des régressions

| # | Cause | Fichier(s) concerné(s) | Symptôme observé |
|---|---|---|---|
| **Bug #1** | `getServerId` retourne `null` au lieu de `localId` pour les entités serveur | `base.repository.ts` | Erreur "parent id non trouvé", aucun appel HTTP au backend |
| **Bug #2** | `fetchUnsynced` filtre `isSync=0` sans `isLocal=1` | `tontine-*-sync.service.ts` | Entités serveur incluses dans la sync → déclenche Bug #1 |
| **Bug #3** | `isLocal`/`isSync` non convertis en boolean dans `findByCommercialPaginated` | `tontine-*.repository.extensions.ts`, `base.repository.ts` | Comportement imprévisible sur les branches conditionnelles |
| **Bug #4** | `countUnsynced` sans filtre `commercialUsername` | `base.repository.ts` | Surestimation du nombre de batches, boucles inutiles |

---

## Partie IV — Plan de résolution

### Étape 1 — Corriger `getServerId` dans `base.repository.ts` (Bug #1 — Critique)

**Principe :** Si aucun mapping n'est trouvé dans `id_mappings`, vérifier si le `localId` est déjà un entier numérique. Si c'est le cas, il s'agit d'un ID serveur direct et on le retourne tel quel.

```typescript
// base.repository.ts — CORRECTION
async getServerId(localId: string, entityType: string): Promise<string | null> {
    if (!localId) return null;
    const result = await this.databaseService.query(
        'SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?',
        [localId, entityType]
    );
    if (result && result.values && result.values.length > 0) {
        return result.values[0].serverId;
    }
    // FALLBACK : si l'ID est déjà numérique, c'est un ID serveur direct
    // (entité reçue du serveur, pas de mapping nécessaire)
    if (/^\d+$/.test(localId)) {
        return localId;
    }
    return null;
}
```

**Justification :** Les IDs locaux sont des UUID (ex: `"a3f2b1c4-..."`) et les IDs serveur sont des entiers (ex: `"42"`). Cette distinction est fiable et reproduit exactement le comportement de `enhance-sync`.

---

### Étape 2 — Corriger `fetchUnsynced` pour ajouter le filtre `isLocal = true` (Bug #2 — Critique)

**Fichiers :** `tontine-member-sync.service.ts`, `tontine-collection-sync.service.ts`, `tontine-delivery-sync.service.ts`

```typescript
// tontine-member-sync.service.ts — CORRECTION
protected override async fetchUnsynced(limit: number): Promise<TontineMember[]> {
    const commercialUsername = this.authService.currentUser?.username || '';
    if (!commercialUsername) return [];
    const page = await this.tontineMemberRepositoryExtensions.findByCommercialPaginated(
        commercialUsername, 0, limit,
        { isSync: false, isLocal: true }  // ← AJOUT isLocal: true
    );
    return page.content;
}
```

Appliquer la même correction dans `TontineCollectionSyncService.fetchUnsynced` et `TontineDeliverySyncService.fetchUnsynced`.

**Note :** Les entités modifiées (`isLocal = 0, isSync = 0`) doivent être gérées séparément via une méthode `fetchModified` et une branche `syncModified` dédiée, comme c'était le cas dans `enhance-sync` avec `getModifiedTontineMembers()`.

---

### Étape 3 — Corriger la conversion boolean dans `findByCommercialPaginated` (Bug #3 — Important)

**Fichiers :** `tontine-member.repository.extensions.ts`, `tontine-collection.repository.extensions.ts`, `tontine-delivery.repository.extensions.ts`

Dans chacune des méthodes `findByCommercialPaginated` (sans session), remplacer le cast direct par un mapping explicite :

```typescript
// tontine-member.repository.extensions.ts — CORRECTION
const content = (dataResult.values || []).map((row: any) => ({
    ...row,
    isLocal: !!row.isLocal,
    isSync: !!row.isSync,
})) as TontineMember[];
```

Appliquer la même correction pour `TontineCollection` et `TontineDelivery`.

Également corriger `findById` dans `base.repository.ts` ou surcharger cette méthode dans chaque repository tontine pour assurer la conversion.

---

### Étape 4 — Corriger `countUnsynced` pour filtrer par `commercialUsername` (Bug #4 — Mineur)

**Option A :** Surcharger `countUnsynced` dans chaque repository tontine :

```typescript
// tontine-member.repository.ts — CORRECTION
override async countUnsynced(): Promise<number> {
    const username = /* injecter AuthService ou passer en paramètre */ '';
    const sql = `SELECT COUNT(*) as total FROM tontine_members WHERE isSync = 0 AND isLocal = 1 AND commercialUsername = ?`;
    const result = await this.databaseService.query(sql, [username]);
    return result.values?.[0]?.total || 0;
}
```

**Option B (recommandée) :** Surcharger `getUnsyncedCount()` dans les services tontine pour utiliser `findByCommercialPaginated` avec `{ isSync: false, isLocal: true }` et retourner `totalElements` :

```typescript
// tontine-member-sync.service.ts — CORRECTION
override async getUnsyncedCount(): Promise<number> {
    const commercialUsername = this.authService.currentUser?.username || '';
    if (!commercialUsername) return 0;
    const page = await this.tontineMemberRepositoryExtensions.findByCommercialPaginated(
        commercialUsername, 0, 1, { isSync: false, isLocal: true }
    );
    return page.totalElements;
}
```

---

### Étape 5 — Gérer les entités modifiées (`isLocal = 0, isSync = 0`) (Complément)

Dans `enhance-sync`, les membres tontine **modifiés** (reçus du serveur puis modifiés localement) étaient gérés par `getModifiedTontineMembers()` et `syncSingleTontineMember` via une requête PUT. Cette logique est présente dans `TontineMemberSyncService.updateSingleTontineMember` mais n'est jamais déclenchée car `fetchUnsynced` ne les retourne pas.

Ajouter une méthode `fetchModified` et l'intégrer dans `syncBatch` :

```typescript
// tontine-member-sync.service.ts — COMPLÉMENT
override async syncBatch(limit: number = 50, ...): Promise<...> {
    // Sync des entités locales (CREATE)
    const unsyncedMembers = await this.fetchUnsynced(limit); // isLocal=1, isSync=0
    // Sync des entités modifiées (UPDATE)
    const modifiedMembers = await this.fetchModified(limit); // isLocal=0, isSync=0
    // ... traiter les deux listes
}

protected async fetchModified(limit: number): Promise<TontineMember[]> {
    const page = await this.tontineMemberRepositoryExtensions.findByCommercialPaginated(
        commercialUsername, 0, limit,
        { isSync: false, isLocal: false }
    );
    return page.content;
}
```

---

## Partie V — Ordre de priorité des corrections

| Priorité | Étape | Impact | Effort |
|---|---|---|---|
| **P0 — Bloquant** | Étape 1 : Corriger `getServerId` | Débloque tous les appels HTTP | Faible (1 fichier, ~5 lignes) |
| **P0 — Bloquant** | Étape 2 : Ajouter `isLocal: true` dans `fetchUnsynced` | Évite de traiter les entités serveur | Faible (3 fichiers, 1 ligne chacun) |
| **P1 — Important** | Étape 3 : Conversion boolean dans les extensions | Corrige les bugs d'affichage clientName | Moyen (3 fichiers, ~5 lignes chacun) |
| **P2 — Mineur** | Étape 4 : `countUnsynced` avec `commercialUsername` | Évite les boucles inutiles | Moyen (3 services ou 3 repos) |
| **P3 — Amélioration** | Étape 5 : Gérer les entités modifiées | Complète la parité avec enhance-sync | Élevé (refactoring syncBatch) |

---

## Conclusion

La régression principale vient du **remplacement de `getServerIdForEntity` (avec fallback `|| localId`) par `getServerId` (sans fallback)** dans le passage d'une architecture monolithique à une architecture en services spécialisés. Ce changement, combiné à l'absence du filtre `isLocal = 1` dans `fetchUnsynced`, fait que les services de sync tontine lèvent systématiquement une exception avant d'atteindre l'appel HTTP au backend.

Les corrections des Étapes 1 et 2 sont suffisantes pour rétablir le fonctionnement de la synchronisation. Les Étapes 3 à 5 complètent la robustesse de l'implémentation.
