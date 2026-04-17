# Plan d'Implémentation : Vues SQL Natives et Filtres de Synchronisation

## Contexte
Actuellement, l'assemblage des données pour l'affichage (ex: Client + Compte) se fait souvent en mémoire, ce qui est peu performant. De plus, le service de synchronisation nécessite de pouvoir filtrer finement les données locales et non synchronisées.
L'une des exigences clés est de pouvoir filtrer toutes les vues par le **quartier (localité) du client**, en plus des filtres existants.

## 1. Stratégie d'Implémentation des Vues Natives

Nous allons créer des interfaces "View" et les peupler via des requêtes `JOIN` SQL directes.
**Chaque Vue inclura systématiquement `clientQuarter`** pour permettre le filtrage.

### Pattern Générique
Pour chaque entité nécessitant une vue enrichie :
1.  Définir/Vérifier l'interface `EntityView` (ex: `ClientView`, `DistributionView`).
2.  Ajouter une méthode `findViewsByCommercialPaginated` dans l'extension du repository.
3.  Cette méthode exécutera une requête `SELECT t1.*, c.quarter as clientQuarter, ... FROM table1 t1 JOIN clients c ...` paginée.
4.  Ajouter `clientQuarter` aux paramètres de filtrage.

### Détail par Entité

#### A. ClientView (Client + Account)
*   **Interface** : `Client` + `accountBalance`, `accountNumber`, `accountStatus`. (Le client a déjà `quarter`).
*   **Requête SQL** :
    ```sql
    SELECT c.*, a.accountBalance, a.accountNumber, a.status as accountStatus 
    FROM clients c 
    LEFT JOIN accounts a ON c.id = a.clientId
    WHERE ...
    ```

#### B. DistributionView (Distribution + Client)
*   **Interface** : `Distribution` + `clientName`, `clientPhone`, `clientQuarter`, `clientAddress?`.
*   **Requête SQL** :
    ```sql
    SELECT d.*, c.fullName as clientName, c.phone as clientPhone, c.quarter as clientQuarter
    FROM distributions d 
    JOIN clients c ON d.clientId = c.id
    WHERE ...
    ```

#### C. RecoveryView (Recovery + Client + Distribution)
*   **Interface** : `Recovery` + `clientName`, `clientQuarter`, `distributionReference`.
*   **Requête SQL** :
    ```sql
    SELECT r.*, c.fullName as clientName, c.quarter as clientQuarter, d.reference as distributionReference
    FROM recoveries r 
    JOIN clients c ON r.clientId = c.id
    LEFT JOIN distributions d ON r.distributionId = d.id
    WHERE ...
    ```

#### D. TontineMemberView (Member + Client)
*   **Interface** : `TontineMember` + `clientName`, `clientPhone`, `clientQuarter`.
*   **Requête SQL** :
    ```sql
    SELECT tm.*, c.fullName as clientName, c.phone as clientPhone, c.quarter as clientQuarter
    FROM tontine_members tm 
    JOIN clients c ON tm.clientId = c.id
    WHERE ...
    ```

#### E. TontineCollectionView (Collection + Member + Client)
*   **Interface** : `TontineCollection` + `clientName`, `clientQuarter`, `memberUniqueId?`.
*   **Requête SQL** :
    ```sql
    SELECT tc.*, c.fullName as clientName, c.quarter as clientQuarter
    FROM tontine_collections tc 
    JOIN tontine_members tm ON tc.tontineMemberId = tm.id
    JOIN clients c ON tm.clientId = c.id
    WHERE ...
    ```

#### F. TontineDeliveryView (Delivery + Client)
*   **Interface** : `TontineDelivery` + `clientName`, `clientQuarter`.
*   **Requête SQL** :
    ```sql
    SELECT td.*, c.fullName as clientName, c.quarter as clientQuarter
    FROM tontine_deliveries td 
    JOIN tontine_members tm ON td.tontineMemberId = tm.id
    JOIN clients c ON tm.clientId = c.id
    WHERE ...
    ```

## 2. Intégration des Filtres (`isLocal`, `isSync`, `quarter`)

Pour supporter les besoins du `SynchronizationService` et de l'UI (filtrage par quartier), nous allons standardiser l'interface de filtres.

### Mise à jour de l'interface `Filters`
Dans chaque extension, l'objet `filters` acceptera désormais :

```typescript
interface RepositoryViewFilters {
    searchQuery?: string;
    dateFilter?: DateFilter;
    
    // Nouveaux Filtres
    quarter?: string;    // Filtre sur le quartier du client (c.quarter)
    isLocal?: boolean;   // Filtre sur la colonne 'isLocal'
    isSync?: boolean;    // Filtre sur la colonne 'isSync'
}
```

### Implémentation SQL (Clause WHERE)
Dans la construction de la clause `WHERE` :

```typescript
// Filtre Quartier (sur la table client jointe, alias 'c')
if (filters?.quarter) {
    whereConditions.push('c.quarter = ?');
    params.push(filters.quarter);
}

// Filtres Sync (sur la table principale, alias 't1' ou implicite si pas d'ambiguïté)
// Note: Attention aux ambiguïtés si les deux tables ont isLocal/isSync. Utiliser l'alias de la table principale.
if (filters?.isLocal !== undefined) {
    whereConditions.push('t1.isLocal = ?'); // Assumer que t1 est l'alias de la table principale
    params.push(filters.isLocal ? 1 : 0);
}

if (filters?.isSync !== undefined) {
    whereConditions.push('t1.isSync = ?');
    params.push(filters.isSync ? 1 : 0);
}
```

## 3. Plan d'Action

### Étape 1 : Mise à jour des Modèles
*   Vérifier/Créer les interfaces `*View` dans `src/app/models/`.

### Étape 2 : Mise à jour des Repository Extensions
*   Modifier `ClientRepositoryExtensions` (Vue + Filtres)
*   Modifier `DistributionRepositoryExtensions` (Vue + Filtres)
*   Modifier `RecoveryRepositoryExtensions` (Vue + Filtres)
*   Modifier `TontineMemberRepositoryExtensions` (Vue + Filtres)
*   Créer/Modifier `TontineCollection` et `TontineDelivery` extensions.

### Étape 3 : Tests Unitaires / Vérification
*   Vérifier que les requêtes JOIN ramènent bien `clientQuarter`.
*   Vérifier que le filtrage par `quarter` sur une vue (ex: RecoveryView) fonctionne correctement via la jointure.
