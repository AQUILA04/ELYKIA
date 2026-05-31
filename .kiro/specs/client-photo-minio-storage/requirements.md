# Document de Requirements : Client Photo MinIO Storage

## Introduction

Cette feature migre le stockage des photos clients (photo de profil + photo de pièce d'identité) depuis la base de données relationnelle (champs `byte[]` dans `Client` et `PhotoStore`) vers un stockage objet MinIO compatible S3. Chaque photo uploadée est conservée en deux versions : l'image originale haute résolution et un thumbnail (200×200 px). Les URLs MinIO sont persistées dans l'entité `Client`, permettant au frontend web de charger l'original et au mobile de charger uniquement les thumbnails lors des synchronisations en liste. Un job de migration assure la transition des données existantes sans interruption de service.

## Glossaire

- **MinioStorageService** : Service Spring Boot encapsulant toutes les interactions avec le SDK MinIO Java (upload, suppression, vérification d'existence).
- **ImageProcessingService** : Service Spring Boot responsable du redimensionnement des images en thumbnails.
- **PhotoObjectKeyBuilder** : Utilitaire centralisant la construction des chemins d'objets MinIO.
- **ClientService** : Service Spring Boot orchestrant la logique métier liée aux clients, incluant l'upload de photos.
- **ClientController** : Contrôleur REST Spring Boot exposant les endpoints clients.
- **PhotoMigrationJob** : Job Spring Boot migrant les photos existantes de `PhotoStore` vers MinIO.
- **PhotoSyncService** : Service mobile (Ionic/Angular) gérant la synchronisation des photos côté mobile.
- **Client** : Entité JPA représentant un client, contenant les champs URL de photos.
- **PhotoStore** : Entité JPA legacy stockant les photos en `byte[]` (à déprécier puis supprimer).
- **PhotoUploadResultDto** : DTO retourné après un upload de photos, contenant les quatre URLs.
- **ClientPhotoDto** : DTO retournant les URLs de photos d'un client (modifié pour retourner des URLs au lieu de bytes).
- **MigrationReport** : Rapport de fin de migration contenant les compteurs total, migrated, skipped, errors.
- **Bucket** : Conteneur MinIO nommé `elykia-clients` hébergeant toutes les photos clients.
- **Thumbnail** : Version redimensionnée d'une image à 200×200 px encodée en JPEG.

## Requirements

### Requirement 1 : Upload de photos vers MinIO

**User Story :** En tant que commercial ou administrateur, je veux uploader les photos de profil et de pièce d'identité d'un client vers MinIO, afin que les photos soient stockées de manière scalable et accessibles via URL.

#### Critères d'acceptation

1. WHEN une requête `POST /api/v1/clients/{id}/photos` est reçue avec un fichier `profilPhoto`, THE ClientService SHALL générer un thumbnail 200×200 px et uploader l'image originale et le thumbnail vers MinIO sous les clés `clients/{id}/profil/original.jpg` et `clients/{id}/profil/thumb.jpg`.
2. WHEN une requête `POST /api/v1/clients/{id}/photos` est reçue avec un fichier `cardPhoto`, THE ClientService SHALL générer un thumbnail 200×200 px et uploader l'image originale et le thumbnail vers MinIO sous les clés `clients/{id}/card/original.jpg` et `clients/{id}/card/thumb.jpg`.
3. WHEN l'upload MinIO réussit, THE ClientService SHALL persister les quatre URLs (`profilPhotoUrl`, `cardPhotoUrl`, `profilPhotoThumbUrl`, `cardPhotoThumbUrl`) dans l'entité `Client` en base de données.
4. WHEN l'upload MinIO réussit, THE ClientController SHALL retourner un `PhotoUploadResultDto` avec les quatre URLs non nulles et non vides avec HTTP 200.
5. IF le service MinIO est indisponible lors d'un upload, THEN THE ClientService SHALL lever une `ApplicationException("Service de stockage photo indisponible")` résultant en une réponse HTTP 503.
6. IF les bytes de l'image sont vides ou corrompus, THEN THE ImageProcessingService SHALL lever une `ApplicationException("Format d'image non supporté ou fichier corrompu")` résultant en une réponse HTTP 400.
7. WHEN un nouvel upload arrive pour un client existant, THE MinioStorageService SHALL remplacer l'objet existant dans le bucket (pas de versioning, URL stable).

---

### Requirement 2 : Traitement des images (ImageProcessingService)

**User Story :** En tant que développeur, je veux que les images soient automatiquement redimensionnées en thumbnails, afin de réduire la bande passante lors des synchronisations mobiles.

#### Critères d'acceptation

1. WHEN `generateThumbnail(bytes, 200, 200)` est appelé avec des bytes d'image valides, THE ImageProcessingService SHALL retourner des bytes d'image dont les dimensions sont ≤ 200×200 pixels.
2. WHEN `generateThumbnail` est appelé, THE ImageProcessingService SHALL encoder l'image de sortie en JPEG avec une qualité de 80% par défaut.
3. WHEN `generateThumbnail` est appelé avec une image dont le ratio n'est pas 1:1, THE ImageProcessingService SHALL conserver le ratio d'aspect (fit dans 200×200 sans déformation).
4. THE ImageProcessingService SHALL accepter les formats d'entrée JPEG, PNG et WebP.
5. IF les bytes d'entrée sont null, vides ou ne représentent pas une image valide, THEN THE ImageProcessingService SHALL lever une `ApplicationException`.

---

### Requirement 3 : Construction des clés d'objets MinIO (PhotoObjectKeyBuilder)

**User Story :** En tant que développeur, je veux que les chemins d'objets MinIO soient construits de manière cohérente et centralisée, afin d'éviter les incohérences de nommage.

#### Critères d'acceptation

1. THE PhotoObjectKeyBuilder SHALL construire la clé de profil original selon le pattern `clients/{clientId}/profil/original.jpg`.
2. THE PhotoObjectKeyBuilder SHALL construire la clé de thumbnail de profil selon le pattern `clients/{clientId}/profil/thumb.jpg`.
3. THE PhotoObjectKeyBuilder SHALL construire la clé de carte originale selon le pattern `clients/{clientId}/card/original.jpg`.
4. THE PhotoObjectKeyBuilder SHALL construire la clé de thumbnail de carte selon le pattern `clients/{clientId}/card/thumb.jpg`.
5. FOR ALL clientId valides, THE PhotoObjectKeyBuilder SHALL retourner des clés distinctes pour l'original et le thumbnail d'un même type de photo.
6. FOR ALL clientId valides, THE PhotoObjectKeyBuilder SHALL retourner des clés distinctes pour la photo de profil et la photo de carte.

---

### Requirement 4 : Service de stockage MinIO (MinioStorageService)

**User Story :** En tant que développeur, je veux un service encapsulant toutes les interactions avec MinIO, afin d'isoler la dépendance au SDK MinIO du reste de l'application.

#### Critères d'acceptation

1. WHEN `uploadPhoto(objectKey, data, contentType)` est appelé avec des données valides, THE MinioStorageService SHALL uploader les bytes vers le bucket `elykia-clients` à la clé spécifiée et retourner une URL publique non nulle et non vide.
2. WHEN `deletePhoto(objectKey)` est appelé, THE MinioStorageService SHALL supprimer l'objet correspondant du bucket.
3. WHEN `exists(objectKey)` est appelé après un upload réussi, THE MinioStorageService SHALL retourner `true`.
4. WHEN `exists(objectKey)` est appelé après une suppression, THE MinioStorageService SHALL retourner `false`.
5. THE MinioStorageService SHALL créer le bucket `elykia-clients` s'il n'existe pas au démarrage de l'application (`@PostConstruct`).
6. THE MinioStorageService SHALL lire la configuration depuis les propriétés Spring `minio.endpoint`, `minio.access-key`, `minio.secret-key`, `minio.bucket`.
7. IF une opération MinIO échoue, THEN THE MinioStorageService SHALL encapsuler l'exception dans une `ApplicationException`.

---

### Requirement 5 : Modification de ClientService

**User Story :** En tant que développeur, je veux que le `ClientService` utilise MinIO pour toutes les opérations de photos, afin de remplacer complètement le stockage en base de données.

#### Critères d'acceptation

1. WHEN `addClient(ClientDto)` est appelé avec des bytes de photo dans le DTO, THE ClientService SHALL uploader les photos vers MinIO et persister les URLs dans `Client` au lieu de créer un `PhotoStore`.
2. WHEN `updateClientPhoto(UpdatePhotoDto)` est appelé, THE ClientService SHALL uploader la nouvelle photo vers MinIO et mettre à jour les URLs dans `Client` au lieu d'appeler `photoStoreRepository.updateProfil/updateCard`.
3. WHEN `checkMissingPhotos(List<Long>)` est appelé, THE ClientService SHALL vérifier `client.profilPhotoUrl` et `client.cardPhotoUrl` au lieu de lire les bytes depuis `PhotoStore`.
4. WHEN `getProfilPhotos(List<Long>)` est appelé, THE ClientService SHALL retourner les URLs thumbnail depuis `Client` au lieu des bytes depuis `PhotoStore`.
5. WHEN `getCardPhotos(List<Long>)` est appelé, THE ClientService SHALL retourner les URLs thumbnail depuis `Client` au lieu des bytes depuis `PhotoStore`.
6. THE ClientService SHALL exposer une méthode `uploadClientPhotos(Long clientId, byte[] profilPhotoBytes, byte[] cardPhotoBytes): PhotoUploadResultDto` annotée `@Transactional`.

---

### Requirement 6 : Nouveaux endpoints REST (ClientController)

**User Story :** En tant que frontend ou mobile, je veux un endpoint multipart pour uploader les photos d'un client, afin de remplacer les anciens endpoints retournant des bytes.

#### Critères d'acceptation

1. THE ClientController SHALL exposer `POST /api/v1/clients/{id}/photos` acceptant un `multipart/form-data` avec les parts optionnelles `profilPhoto`, `cardPhoto`, `cardType`, `cardNumber`.
2. WHEN `POST /api/v1/clients/{id}/photos` réussit, THE ClientController SHALL retourner HTTP 200 avec un corps `{ profilPhotoUrl, cardPhotoUrl, profilPhotoThumbUrl, cardPhotoThumbUrl }`.
3. WHEN `GET /api/v1/clients/{id}` est appelé, THE ClientController SHALL inclure `profilPhotoUrl` (URL originale) dans la réponse `ClientRespDto`.
4. WHEN `GET /api/v1/clients/by-commercial/{username}` est appelé (liste mobile), THE ClientController SHALL inclure uniquement `profilPhotoThumbUrl` et `cardPhotoThumbUrl` dans les éléments de la liste paginée.
5. THE ClientController SHALL supprimer les endpoints `POST /api/v1/clients/profil-photos` et `POST /api/v1/clients/card-photos` qui retournaient des bytes.
6. THE ClientController SHALL supprimer l'endpoint `POST /api/v1/clients/photos-batch-update` qui uploadait des bytes depuis le mobile.

---

### Requirement 7 : Job de migration des données existantes (PhotoMigrationJob)

**User Story :** En tant qu'administrateur, je veux migrer les photos existantes stockées en base de données vers MinIO, afin de ne pas perdre les données lors de la transition.

#### Critères d'acceptation

1. THE PhotoMigrationJob SHALL être déclenché via `POST /api/v1/admin/migrate-photos` protégé par `@PreAuthorize("hasRole('ADMIN')")`.
2. WHEN le job de migration s'exécute, THE PhotoMigrationJob SHALL traiter les clients par pages de 10 pour limiter la consommation mémoire.
3. WHEN le job de migration rencontre un client dont `profilPhotoUrl` et `cardPhotoUrl` sont déjà renseignées, THE PhotoMigrationJob SHALL ignorer ce client (comportement idempotent).
4. WHEN le job de migration traite un client, THE PhotoMigrationJob SHALL uploader l'original et le thumbnail vers MinIO, puis mettre à jour les URLs dans `Client` de manière atomique.
5. IF l'upload MinIO échoue pour un client, THEN THE PhotoMigrationJob SHALL loguer l'erreur, ajouter le client à la liste `errors` du rapport, et continuer le traitement des autres clients.
6. WHEN le job de migration se termine, THE PhotoMigrationJob SHALL retourner un `MigrationReport` avec les compteurs `total`, `migrated`, `skipped` et `errors` satisfaisant `total = migrated + skipped + errors`.
7. THE PhotoMigrationJob SHALL exposer `GET /api/v1/admin/migrate-photos/status` pour consulter l'état d'avancement.

---

### Requirement 8 : Modification du schéma de données

**User Story :** En tant que développeur, je veux supprimer les colonnes binaires obsolètes après migration complète, afin d'alléger la base de données.

#### Critères d'acceptation

1. THE Client entity SHALL marquer les champs `byte[] profilPhoto` et `byte[] IDDoc` comme `@Deprecated` dans un premier temps.
2. WHEN la migration est validée, THE Flyway migration SHALL supprimer les colonnes `profil_photo` et `i_d_doc` de la table `client` via un script `ALTER TABLE client DROP COLUMN IF EXISTS profil_photo; ALTER TABLE client DROP COLUMN IF EXISTS i_d_doc;`.
3. WHEN la migration est validée, THE Flyway migration SHALL supprimer la table `photo_store` via `DROP TABLE IF EXISTS photo_store;`.
4. THE ClientPhotoDto SHALL être modifié pour retourner `photoUrl` (URL originale) et `thumbUrl` (URL thumbnail) au lieu de `byte[] photo`.

---

### Requirement 9 : Impact sur le mobile (PhotoSyncService)

**User Story :** En tant que mobile, je veux recevoir les URLs MinIO directement dans la réponse de synchronisation des clients, afin de ne plus avoir besoin d'appels batch séparés pour récupérer les photos.

#### Critères d'acceptation

1. WHEN `fetchPageAndSave` est appelé lors de la synchronisation mobile, THE PhotoSyncService SHALL persister les URLs `profilPhotoThumbUrl` et `cardPhotoThumbUrl` reçues dans SQLite sans appels batch séparés vers les anciens endpoints de photos.
2. THE PhotoSyncService SHALL ne plus appeler les endpoints `POST /api/v1/clients/profil-photos` et `POST /api/v1/clients/card-photos`.
3. WHERE le mode offline est requis, THE PhotoSyncService SHALL télécharger les thumbnails depuis les URLs MinIO et les sauvegarder dans `Filesystem (Directory.Data)` pour un accès hors connexion.
4. THE mobile SQLite schema SHALL conserver les colonnes existantes `profilPhotoUrl`, `cardPhotoUrl`, `profilPhotoThumbUrl`, `cardPhotoThumbUrl` sans modification de schéma.

---

### Requirement 10 : Configuration et sécurité

**User Story :** En tant qu'administrateur système, je veux que les credentials MinIO soient sécurisés et que le bucket soit correctement configuré, afin de protéger les données photos des clients.

#### Critères d'acceptation

1. THE application SHALL lire les credentials MinIO depuis les variables d'environnement `MINIO_ACCESS_KEY` et `MINIO_SECRET_KEY`, jamais depuis des fichiers de configuration versionnés.
2. THE bucket `elykia-clients` SHALL être configuré en lecture publique pour les objets photos uniquement — les opérations d'écriture et de suppression restent réservées au backend.
3. THE ClientController SHALL valider le content-type et la taille maximale (10 Mo) des fichiers uploadés avant traitement.
4. THE endpoint `POST /api/v1/admin/migrate-photos` SHALL être protégé par `@PreAuthorize("hasRole('ADMIN')")`.
5. THE application.yml SHALL définir les propriétés `minio.endpoint`, `minio.access-key`, `minio.secret-key`, `minio.bucket`, `minio.public-url` avec les valeurs lues depuis les variables d'environnement.

---

### Requirement 11 : Dépendances

**User Story :** En tant que développeur, je veux que les dépendances nécessaires soient ajoutées au projet, afin de pouvoir utiliser le SDK MinIO et la bibliothèque de traitement d'images.

#### Critères d'acceptation

1. THE `pom.xml` SHALL inclure la dépendance `io.minio:minio:8.5.7` pour le SDK MinIO Java.
2. THE `pom.xml` SHALL inclure la dépendance `net.coobird:thumbnailator:0.4.20` pour le redimensionnement d'images.
