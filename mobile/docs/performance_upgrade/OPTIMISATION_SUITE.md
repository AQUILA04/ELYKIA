
---

# RAPPORT D'OPTIMISATION TECHNIQUE : PROJET ELYKIA

**Objet :** Amélioration des performances, de la gestion mémoire et de la stabilité offline.
**Auteur :** Gemini (Expert AI Collaborator)
**Date :** 25 Février 2026

---

## 1. OPTIMISATION DU PIPELINE CI/CD (Android)

Pour permettre à l'application de traiter un volume de données considérable sur le terrain, l'allocation mémoire native doit être augmentée au niveau du build.

### A. Manifeste Android

Il est impératif d'activer le `largeHeap` pour éviter les crashs lors de la manipulation du Store NgRx ou de listes d'images.

* **Action :** Modifier `.github/workflows/android-config/AndroidManifest.xml`.
* **Code :**

```xml
<application
    android:largeHeap="true"
    android:hardwareAccelerated="true"
    ...>

```

### B. Paramètres Gradle

Le processus de compilation peut saturer la RAM du runner GitHub Actions.

* **Action :** Modifier `ci.yml` pour allouer 4Go de RAM au processus Java de Gradle.
* **Code :**

```yaml
- name: Build Android Debug APK
  run: |
    cd android
    ./gradlew assembleDebug -Dorg.gradle.jvmargs="-Xmx4096m"

```

---

## 2. RESTRUCTURATION DU STORE NGRX (Performance O(1))

La gestion actuelle en doublon (`state.clients` + `state.pagination`) consomme 2x plus de RAM et ralentit les mises à jour.

### A. Migration vers @ngrx/entity

Le store doit utiliser un dictionnaire (Map) plutôt qu'un tableau simple.

* **Action :** Supprimer `clients: Client[]` du state et utiliser `EntityState<Client>`.
* **Bénéfice :** Accès direct à un client par son ID sans parcourir toute la liste.

### B. Optimisation des Sélecteurs (Mapping)

Le sélecteur actuel fait un `.find()` dans les comptes pour chaque client, créant une complexité $O(n^2)$.

* **Action :** Créer une "Map" des comptes avant de mapper les clients.
* **Code proposé :**

```typescript
export const selectAccountsMap = createSelector(
  selectAllAccounts,
  (accounts) => accounts.reduce((acc, a) => ({ ...acc, [a.clientId]: a }), {})
);

export const selectPaginatedClientViews = createSelector(
  selectPaginatedClients,
  selectAccountsMap,
  (clients, accMap) => clients.map(c => ({ ...c, account: accMap[c.id] }))
);

```

---

## 3. STRATÉGIE DE GESTION DES IMAGES (Offline-First)

L'application stocke actuellement des images en $800 \times 800$ et les manipule parfois en Base64, ce qui sature le Heap Java.

### A. Principe de Double Stockage

Ne stockez jamais de Base64 dans le Store NgRx.

* **Stockage Physique :** Image HD ($800 \times 800$) sur le filesystem pour la synchro backend.
* **Stockage Store :** Uniquement le **chemin du fichier** (String).
* **Affichage Liste :** Créer une miniature (Thumbnail) de $200 \times 200$ pixels lors de la capture.

### B. Correction du Cache d'Images

Le cache actuel stocke des `Observable` qui ne sont jamais libérés, créant une fuite mémoire.

* **Action :** Utiliser un cache de type `Map<string, SafeUrl>` simple dans `clients.page.ts`.

---

## 4. GESTION DES RAPPORTS ET PURGE DES DONNÉES

Pour générer des rapports complets sans impacter la fluidité de la liste paginée :

* **Action :** Utiliser un sélecteur global `selectAll` d'Entity pour le rapport, qui ignore les filtres de la pagination.
* **Action de Purge :** Implémenter une action `clearSyncedClients` pour vider le store des clients déjà synchronisés avec succès le soir, libérant ainsi la RAM pour la journée suivante.

---

**Conclusion :** En appliquant ces corrections, l'application pourra gérer des milliers de clients sur un appareil de 6Go de RAM sans ralentissement notable, tout en garantissant l'intégrité des données pour vos rapports exportés.

---

*Souhaitez-vous que je génère le code complet du nouveau `client.reducer.ts` basé sur @ngrx/entity pour remplacer votre version actuelle ?*
