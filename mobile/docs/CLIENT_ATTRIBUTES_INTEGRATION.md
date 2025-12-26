# Intégration des nouveaux attributs Client

## Résumé des modifications

### ✅ **Attributs ajoutés au modèle Client :**
- `profilPhotoUrl?: string` - URL/chemin de la photo de profil
- `cardPhotoUrl?: string` - URL/chemin de la photo de carte d'identité  
- `updatedPhotoUrl?: boolean` - Flag pour marquer les clients avec URLs modifiées

### ✅ **Modèle ClientView mis à jour :**
- `photoUrl?: SafeUrl` - URL sécurisée pour l'affichage de la photo de profil
- `cardPhotoSafeUrl?: SafeUrl` - URL sécurisée pour l'affichage de la photo de carte (renommé pour éviter conflit)

### ✅ **Page new-client (création de nouveaux clients) :**
**Fichier :** `src/app/features/clients/new-client/new-client.page.ts`

```typescript
// Initialisation des nouveaux attributs lors de la création
clientData.profilPhotoUrl = profilPhotoPath; // Même valeur que profilPhoto
clientData.cardPhotoUrl = cardPhotoPath;     // Même valeur que cardPhoto  
clientData.updatedPhotoUrl = false;          // Nouveau client, pas de mise à jour nécessaire
```

### ✅ **Base de données - Méthode saveClients (insertion/mise à jour complète) :**
**Fichier :** `src/app/core/services/database.service.ts`

#### INSERT :
```sql
INSERT INTO clients (..., profilPhotoUrl, cardPhotoUrl, updatedPhotoUrl) 
VALUES (..., ?, ?, ?)
```

#### UPDATE :
```sql
UPDATE clients SET ..., profilPhotoUrl = ?, cardPhotoUrl = ?, updatedPhotoUrl = ? 
WHERE id = ?
```

#### Hash de synchronisation :
```typescript
const keysToInclude = [..., 'profilPhotoUrl', 'cardPhotoUrl'];
```

### ✅ **Méthodes de mise à jour partielle :**
- `updateClient()` - Mise à jour générale du client (NON modifiée)
- `updateClientPhotosAndInfo()` - **MODIFIÉE** - Mise à jour des photos ET URLs
- `updateClientLocation()` - Mise à jour de la localisation (NON modifiée)

**Logique :** 
- `updateClientPhotosAndInfo()` gère les photos donc doit aussi gérer les URLs de photos
- Les autres méthodes restent inchangées car elles ne touchent pas aux photos

### ✅ **Migration de base de données :**
**Version 5 :** Ajout des colonnes dans la table `clients`
```sql
ALTER TABLE clients ADD COLUMN profilPhotoUrl TEXT;
ALTER TABLE clients ADD COLUMN cardPhotoUrl TEXT;  
ALTER TABLE clients ADD COLUMN updatedPhotoUrl BOOLEAN DEFAULT 0;
```

## Flux de données

### 1. **Création d'un nouveau client :**
1. L'utilisateur prend des photos → sauvegarde dans le système de fichiers
2. `profilPhoto` et `cardPhoto` = chemins des fichiers
3. `profilPhotoUrl` et `cardPhotoUrl` = initialisés avec les mêmes chemins
4. `updatedPhotoUrl` = false (nouveau client)
5. Sauvegarde via `saveClients()` avec tous les attributs

### 2. **Mise à jour des photos d'un client existant :**
1. L'utilisateur modifie les photos via la page client-detail
2. Nouvelles photos sauvegardées dans le système de fichiers
3. `updateClientPhotosAndInfo()` met à jour photos ET URLs
4. Marque `updatedPhoto = true` et `updatedPhotoUrl = true`
5. Synchronisation lors du prochain sync

### 3. **Synchronisation des photos depuis l'API :**
1. `PhotoSyncService` télécharge les photos depuis l'API
2. Met à jour `profilPhotoUrl` et `cardPhotoUrl` avec les nouveaux chemins
3. Marque `updatedPhotoUrl = true` pour synchronisation
4. `SynchronizationService` envoie les URLs au serveur
5. Marque `updatedPhotoUrl = false` après synchronisation

### 3. **Cohérence des données :**
- **Nouveaux clients :** `profilPhoto` = `profilPhotoUrl` (même fichier)
- **Clients synchronisés :** `profilPhotoUrl` peut différer de `profilPhoto` (optimisation)
- **Flag de synchronisation :** `updatedPhotoUrl` indique si les URLs doivent être envoyées au serveur

## Points d'attention

### ✅ **Bonnes pratiques respectées :**
- Séparation entre insertion complète et mises à jour partielles
- Pas de modification des méthodes existantes de mise à jour partielle
- Migration de base de données pour compatibilité ascendante
- Initialisation correcte des nouveaux attributs

### ⚠️ **À surveiller :**
- Cohérence entre `profilPhoto`/`profilPhotoUrl` et `cardPhoto`/`cardPhotoUrl`
- Gestion du flag `updatedPhotoUrl` lors des modifications manuelles
- Performance des requêtes avec les nouveaux attributs

### ✅ **Affichage des photos avec fallback :**
**Fichiers modifiés :**
- `src/app/tabs/clients/clients.page.ts` - Liste des clients
- `src/app/features/clients/pages/client-detail/client-detail.page.ts` - Détail client

**Logique de fallback :**
```typescript
getPhotoUrl(primaryPath: string | undefined, fallbackPath?: string | undefined): Observable<SafeUrl> {
  const path = primaryPath || fallbackPath; // Utiliser profilPhoto en priorité, puis profilPhotoUrl
  // ... logique de chargement avec gestion d'erreur et fallback
}
```

**Ordre de priorité pour l'affichage :**
1. `profilPhoto` (chemin original)
2. `profilPhotoUrl` (URL optimisée) si `profilPhoto` est null/vide
3. Image par défaut si aucun fichier n'existe

## Tests recommandés

1. **Création de nouveau client :** Vérifier que tous les attributs sont correctement initialisés
2. **Migration :** Tester sur une base existante que les colonnes sont ajoutées
3. **Synchronisation :** Vérifier que les URLs sont correctement mises à jour et synchronisées
4. **Mises à jour partielles :** S'assurer qu'elles n'affectent pas les nouveaux attributs
5. **Affichage des photos :** Tester le fallback quand `profilPhoto` est null mais `profilPhotoUrl` existe