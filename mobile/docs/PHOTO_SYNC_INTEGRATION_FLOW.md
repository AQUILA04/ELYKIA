# Intégration de la synchronisation des photos dans le flux d'initialisation

## Flux d'initialisation complet

### 📱 **Page initial-loading.page.ts**
```typescript
// Étapes d'initialisation (ordre d'exécution)
private initSteps = [
  { text: "Récupération des articles...", method: () => this.dataInitService.initializeArticles() },
  { text: "Récupération des commerciaux...", method: () => this.dataInitService.initializeCommercial() },
  { text: "Récupération des localités...", method: () => this.dataInitService.initializeLocalities() },
  { text: "Récupération des clients...", method: () => this.dataInitService.initializeClients() }, // ← PHOTOS INCLUSES ICI
  { text: "Récupération du sorties d'articles...", method: () => this.dataInitService.initializeStockOutputs() },
  { text: "Récupération des distributions...", method: () => this.dataInitService.initializeDistributions() },
  { text: "Récupération des comptes client...", method: () => this.dataInitService.initializeAccounts() },
  { text: "Finalisation...", method: () => this.dataInitService.calculateArticleStocks() },
];
```

### 🔄 **DataInitializationService.initializeClients()**
```typescript
initializeClients(forceRefresh: boolean = false): Observable<boolean> {
  return this.store.select(selectAuthUser).pipe(
    take(1),
    filter(user => !!user),
    switchMap(user => {
      const commercialUsername = user.username;
      // Appel à ClientService.initializeClients() qui inclut la sync des photos
      return this.clientService.initializeClients(commercialUsername, forceRefresh).pipe(
        map(() => {
          this.store.dispatch(ClientActions.loadClients({ commercialUsername }));
          return true;
        })
      );
    })
  );
}
```

### 👥 **ClientService.initializeClients()**
```typescript
// Dans la méthode initializeClients, après sauvegarde des clients :
this.updateProgress({
  isLoading: true,
  message: 'Synchronisation des photos en cours...'
});

// Synchroniser les photos après l'initialisation des clients
try {
  await this.photoSyncService.syncPhotosForClients(); // ← SYNCHRONISATION DES PHOTOS
  this.log.log('[ClientService] Photo synchronization completed');
} catch (error) {
  this.log.log(`[ClientService] Photo synchronization failed: ${error}`);
  // Ne pas faire échouer l'initialisation si la sync des photos échoue
}

this.updateProgress({
  isLoading: false,
  message: `${clients.length} clients synchronisés avec succès`
});
```

### 📸 **PhotoSyncService.syncPhotosForClients()**
```typescript
async syncPhotosForClients(): Promise<void> {
  const preferences = await this.getPhotoSyncPreferences();
  
  // ✅ VÉRIFICATION DES PRÉFÉRENCES (DÉSACTIVÉES PAR DÉFAUT)
  if (!preferences.enableProfilePhotoSync && !preferences.enableCardPhotoSync) {
    this.log.log('[PhotoSyncService] Photo sync disabled in preferences');
    return; // ← SORTIE IMMÉDIATE SI DÉSACTIVÉ
  }

  // Synchronisation uniquement si activée par l'utilisateur
  const clients = await this.dbService.getClients();
  const syncedClients = clients.filter(client => client.isSync && !client.isLocal);
  
  for (const client of syncedClients) {
    await this.syncClientPhotos(client, preferences);
  }
}
```

## Préférences par défaut

### 🔧 **PhotoSyncService - Valeurs par défaut**
```typescript
async getPhotoSyncPreferences(): Promise<PhotoSyncPreferences> {
  const enableProfilePhotoSync = await this.storage.get('enableProfilePhotoSync') || false; // ← DÉFAUT: false
  const enableCardPhotoSync = await this.storage.get('enableCardPhotoSync') || false;       // ← DÉFAUT: false
  
  return {
    enableProfilePhotoSync,
    enableCardPhotoSync
  };
}
```

### 🎛️ **Page More - Toggles par défaut**
```typescript
export class MorePage implements OnInit, OnDestroy {
  enableProfilePhotoSync = false; // ← DÉFAUT: false
  enableCardPhotoSync = false;    // ← DÉFAUT: false

  async ngOnInit() {
    // Charger les préférences sauvegardées (ou garder false si pas de préférences)
    const photoPrefs = await this.photoSyncService.getPhotoSyncPreferences();
    this.enableProfilePhotoSync = photoPrefs.enableProfilePhotoSync;
    this.enableCardPhotoSync = photoPrefs.enableCardPhotoSync;
  }
}
```

## Comportement selon les préférences

### ✅ **Synchronisation ACTIVÉE (utilisateur a activé les toggles)**
1. **Initialisation** → Récupération des clients depuis l'API
2. **Sauvegarde** → Clients sauvegardés en base locale
3. **Vérification préférences** → `enableProfilePhotoSync = true` ou `enableCardPhotoSync = true`
4. **Synchronisation photos** → Téléchargement des photos manquantes depuis l'API
5. **Mise à jour URLs** → `profilPhotoUrl` et `cardPhotoUrl` mis à jour
6. **Marquage sync** → `updatedPhotoUrl = true` pour synchronisation vers serveur

### ❌ **Synchronisation DÉSACTIVÉE (défaut)**
1. **Initialisation** → Récupération des clients depuis l'API
2. **Sauvegarde** → Clients sauvegardés en base locale
3. **Vérification préférences** → `enableProfilePhotoSync = false` ET `enableCardPhotoSync = false`
4. **Sortie immédiate** → Aucune synchronisation de photos
5. **Finalisation** → Initialisation terminée sans téléchargement de photos

## Avantages de cette approche

### 🚀 **Performance**
- **Initialisation rapide** : Pas de téléchargement de photos par défaut
- **Bande passante préservée** : L'utilisateur contrôle la consommation de données
- **Expérience utilisateur** : Initialisation ne bloque pas sur les photos

### 🎛️ **Contrôle utilisateur**
- **Opt-in** : L'utilisateur doit explicitement activer la synchronisation
- **Granularité** : Contrôle séparé pour photos de profil et cartes d'identité
- **Réversible** : Peut désactiver à tout moment

### 🔄 **Robustesse**
- **Non-bloquant** : Échec de sync photos n'interrompt pas l'initialisation
- **Fallback** : Affichage fonctionne avec ou sans photos synchronisées
- **Récupération** : Peut relancer la sync plus tard via les paramètres

## Résumé

✅ **La synchronisation des photos EST intégrée dans le flux d'initialisation**
✅ **Les toggles SONT désactivés par défaut**  
✅ **L'initialisation N'EST PAS ralentie** (sync photos uniquement si activée)
✅ **L'utilisateur A le contrôle** via les paramètres de la page More