# Implémentation de la Synchronisation des Photos

## Vue d'ensemble

Cette implémentation ajoute la fonctionnalité de synchronisation des photos de profil et des cartes d'identité des clients pour améliorer les performances de l'application en évitant l'envoi de données base64 volumineuses.

## Fonctionnalités ajoutées

### 1. Migration de la base de données (v5)
- Ajout des colonnes `profilPhotoUrl` et `cardPhotoUrl` dans la table `clients`
- Ajout de la colonne `updatedPhotoUrl` pour marquer les clients avec des URLs modifiées

### 2. Service PhotoSyncService
- **Localisation**: `src/app/core/services/photo-sync.service.ts`
- **Fonctionnalités**:
  - Gestion des préférences utilisateur pour la synchronisation des photos
  - Récupération des photos depuis les nouvelles APIs backend
  - Sauvegarde des photos dans le système de fichiers mobile
  - Mise à jour des URLs des photos dans la base de données locale

### 3. Préférences utilisateur
- **Page More**: Ajout de deux toggles pour activer/désactiver la synchronisation
  - "Activer la synchronisation des photos de profil"
  - "Activer la synchronisation des pièces d'identité"
- **Stockage**: Préférences sauvegardées dans le Storage Ionic

### 4. Intégration dans ClientService
- Synchronisation automatique des photos après l'initialisation des clients
- Méthode `syncClientPhotoUrls()` pour envoyer les URLs mises à jour au backend

### 5. APIs Backend utilisées
- `GET /api/v1/clients/profil-photo/{id}` - Récupération photo de profil
- `GET /api/v1/clients/card-photo/{id}` - Récupération photo carte d'identité
- `PATCH /api/v1/clients/update-photo-url` - Mise à jour des URLs de photos

## Structure des fichiers

```
src/app/
├── core/services/
│   ├── photo-sync.service.ts          # Service principal de synchronisation
│   ├── sync-manager.service.ts        # Gestionnaire de synchronisation globale
│   ├── migration.service.ts           # Migration v5 ajoutée
│   └── client.service.ts              # Intégration de la sync photos
├── models/
│   ├── client.model.ts                # Nouvelles propriétés ajoutées
│   └── client-photo-url-update.dto.ts # DTO pour l'API PATCH
└── tabs/more/
    ├── more.page.ts                   # Gestion des préférences
    └── more.page.html                 # Interface des toggles
```

## Flux de fonctionnement

### 1. Initialisation des clients
1. `ClientService.initializeClients()` récupère les données clients depuis l'API
2. Après sauvegarde, `PhotoSyncService.syncPhotosForClients()` est appelé
3. Pour chaque client synchronisé, vérification si les photos doivent être récupérées
4. Téléchargement et sauvegarde des photos manquantes
5. Mise à jour des URLs dans la base de données locale

### 2. Synchronisation complète (incluant URLs de photos)
1. `SynchronizationService.synchronizeAllData()` gère toutes les phases de synchronisation
2. La nouvelle phase `updated-photo-url-clients` identifie les clients avec `updatedPhotoUrl = 1`
3. Pour chaque client, envoi d'une requête PATCH avec les nouvelles URLs
4. Marquage du client comme synchronisé (`updatedPhotoUrl = 0`)
5. Intégration dans le système de progression et de gestion d'erreurs existant

### 3. Gestion des préférences
1. L'utilisateur active/désactive les toggles sur la page More
2. Les préférences sont sauvegardées via `PhotoSyncService.setPhotoSyncPreferences()`
3. Lors de la synchronisation, seules les photos activées sont récupérées

## Configuration requise

### Backend
- Implémentation des endpoints pour récupérer les photos individuellement
- Endpoint PATCH pour recevoir les URLs de photos mises à jour

### Mobile
- Migration de la base de données vers la version 5
- Permissions de stockage pour sauvegarder les photos

## Utilisation

### Activation des préférences
```typescript
// Dans la page More, l'utilisateur peut activer/désactiver
this.enableProfilePhotoSync = true;
this.enableCardPhotoSync = true;
```

### Synchronisation manuelle
```typescript
// Synchronisation complète (données + photos + URLs)
await this.syncManagerService.performFullSync(username);

// Synchronisation des photos uniquement (téléchargement)
await this.syncManagerService.syncPhotosOnly();

// Synchronisation des URLs de photos uniquement (envoi vers serveur)
await this.syncManagerService.syncPhotoUrlsOnly();
```

### Vérification des photos à synchroniser
```typescript
const clientsToSync = await this.photoSyncService.getClientsWithUpdatedPhotoUrls();
```

### Phases de synchronisation
La synchronisation suit maintenant ces phases dans l'ordre :
1. `localities` - Synchronisation des localités
2. `cash-check` - Vérification de la caisse
3. `clients` - Nouveaux clients
4. `updated-clients` - Clients modifiés (localisation)
5. `updated-photo-clients` - Photos des clients (base64)
6. `updated-photo-url-clients` - **NOUVELLE PHASE** - URLs des photos
7. `accounts` - Comptes
8. `distributions` - Distributions
9. `recoveries` - Recouvrements
10. `orders` - Commandes
11. `updates` - Mises à jour serveur
12. `completed` - Terminé

## Points d'attention

1. **Performance**: La synchronisation des photos se fait après l'initialisation des clients pour ne pas bloquer l'interface
2. **Gestion d'erreurs**: Les erreurs de synchronisation des photos n'interrompent pas l'initialisation des clients
3. **Stockage**: Les photos sont sauvegardées dans `client_photos/` et `card_photos/` comme précédemment
4. **Vérification**: Le système vérifie l'existence des fichiers avant de les télécharger à nouveau

## Migration

La migration v5 est automatiquement appliquée lors de la mise à jour de l'application. Elle ajoute les colonnes nécessaires sans perte de données existantes.

## Tests recommandés

1. Vérifier que la migration s'applique correctement
2. Tester l'activation/désactivation des préférences
3. Vérifier la synchronisation des photos pour les nouveaux clients
4. Tester la synchronisation des URLs vers le serveur
5. Vérifier le comportement en cas d'erreur réseau