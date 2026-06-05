# Implementation Plan

## Overview

Ce plan d'implémentation couvre la migration complète du stockage des photos clients depuis la base de données PostgreSQL vers MinIO S3, incluant un mécanisme de résilience (pattern Outbox) pour garantir que l'enregistrement d'un client réussit même si MinIO est temporairement indisponible. Il est organisé en 18 tâches couvrant : les dépendances Maven, les nouveaux services backend (MinioStorageService, ImageProcessingService, PhotoObjectKeyBuilder, PhotoOutboxEntry, PhotoOutboxRetryScheduler), le refactoring de ClientService et ClientController, le job de migration des données existantes, l'intégration dans l'infrastructure Docker Compose / Traefik existante (stacks test et prod), le refactoring mobile, l'affichage frontend, et le nettoyage final des colonnes binaires via Flyway.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1, 11]
    },
    {
      "wave": 2,
      "tasks": [2, 12]
    },
    {
      "wave": 3,
      "tasks": [3]
    },
    {
      "wave": 4,
      "tasks": [4]
    },
    {
      "wave": 5,
      "tasks": [5, 6]
    },
    {
      "wave": 6,
      "tasks": [7, 13]
    },
    {
      "wave": 7,
      "tasks": [8, 9, 15, 16]
    },
    {
      "wave": 8,
      "tasks": [10, 14]
    },
    {
      "wave": 9,
      "tasks": [17]
    },
    {
      "wave": 10,
      "tasks": [18]
    }
  ]
}
```

## Tasks

- [ ] 1. Ajouter les dépendances Maven (MinIO SDK + Thumbnailator)
  - Ouvrir `backend-lib/elykia-client/pom.xml` (ou le pom parent si les dépendances sont centralisées)
  - Ajouter `io.minio:minio:8.5.7` dans la section `<dependencies>`
  - Ajouter `net.coobird:thumbnailator:0.4.20` dans la section `<dependencies>`
  - Vérifier qu'il n'y a pas de conflit de version avec les dépendances existantes (OkHttp, Guava utilisés par le SDK MinIO)
  - Lancer `mvn dependency:tree` pour confirmer la résolution
  - **Validates:** Requirement 11.1, 11.2

- [ ] 2. Créer la configuration Spring Boot pour MinIO et le fallback
  - Créer la classe `MinioProperties` annotée `@ConfigurationProperties(prefix = "minio")` avec les champs `endpoint`, `accessKey`, `secretKey`, `bucket`, `publicUrl`
  - Ajouter dans `application.yml` les propriétés `minio.*` lisant depuis les variables d'environnement : `${MINIO_ENDPOINT}`, `${MINIO_ACCESS_KEY}`, `${MINIO_SECRET_KEY}`, `${MINIO_BUCKET:elykia-clients}`, `${MINIO_PUBLIC_URL}`
  - Ajouter la propriété `photo.fallback.path: ${PHOTO_FALLBACK_PATH:/opt/elykia/photos/pending}` dans `application.yml`
  - Annoter la classe principale ou une `@Configuration` avec `@EnableConfigurationProperties(MinioProperties.class)`
  - **Validates:** Requirement 10.1, 10.5, 13.9

- [ ] 3. Implémenter `PhotoObjectKeyBuilder`
  - Créer la classe utilitaire `PhotoObjectKeyBuilder` dans le package `com.optimize.elykia.client.storage`
  - Implémenter les quatre méthodes statiques : `profilOriginal(Long clientId)`, `profilThumb(Long clientId)`, `cardOriginal(Long clientId)`, `cardThumb(Long clientId)`
  - Chaque méthode retourne une `String` au format `clients/{clientId}/{type}/{variant}.jpg`
  - Écrire les tests unitaires `PhotoObjectKeyBuilderTest` vérifiant les patterns et la distinction des clés (Properties 3, 4, 5)
  - **Validates:** Requirement 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

- [ ] 4. Implémenter `ImageProcessingService`
  - Créer l'interface `ImageProcessingService` dans `com.optimize.elykia.client.storage`
  - Créer l'implémentation `ThumbnailatorImageProcessingService` annotée `@Service`
  - Implémenter `generateThumbnail(byte[] original, int width, int height)` en utilisant `Thumbnailator` : `Thumbnails.of(new ByteArrayInputStream(original)).size(width, height).outputFormat("JPEG").outputQuality(0.8).toOutputStream(baos)`
  - Gérer les cas d'erreur : bytes null/vides → `ApplicationException`, format non supporté → `ApplicationException`
  - Écrire les tests unitaires `ImageProcessingServiceTest` vérifiant les dimensions, l'encodage JPEG (magic bytes `0xFF 0xD8`), la conservation du ratio, et les cas d'erreur (Properties 1, 2)
  - **Validates:** Requirement 2.1, 2.2, 2.3, 2.4, 2.5

- [ ] 5. Implémenter `MinioStorageService` avec méthode `isAvailable()`
  - Créer l'interface `MinioStorageService` dans `com.optimize.elykia.client.storage` avec les méthodes `uploadPhoto`, `deletePhoto`, `exists`, et `isAvailable(): boolean`
  - Créer l'implémentation `MinioStorageServiceImpl` annotée `@Service`
  - Injecter `MinioProperties` et instancier `MinioClient` dans le constructeur
  - Implémenter `@PostConstruct initBucket()` : créer le bucket `elykia-clients` s'il n'existe pas, configurer la politique de lecture publique via `SetBucketPolicyArgs`
  - Implémenter `uploadPhoto`, `deletePhoto`, `exists` comme défini dans le design
  - Implémenter `isAvailable()` : tenter `statBucket()` sur le bucket `elykia-clients`, retourner `false` en cas d'exception sans propager l'erreur
  - Encapsuler toutes les exceptions MinIO dans `ApplicationException` (sauf `isAvailable` qui absorbe silencieusement)
  - Écrire les tests unitaires `MinioStorageServiceTest` avec mock du `MinioClient` (Properties 6, 7, 8), incluant le test de `isAvailable()` quand MinIO est down
  - **Validates:** Requirement 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 13.8

- [ ] 6. Implémenter le pattern Outbox (PhotoOutboxEntry + PhotoOutboxRetryScheduler)
  - Créer l'entité JPA `PhotoOutboxEntry` dans `com.optimize.elykia.client.outbox` avec les champs : `id` (Long, auto), `clientId` (Long), `photoType` (enum PhotoType), `localFilePath` (String), `status` (enum OutboxStatus : PENDING/IN_PROGRESS/DONE/FAILED), `retryCount` (int, défaut 0), `lastAttemptAt` (LocalDateTime), `createdAt` (LocalDateTime), `errorMessage` (String nullable)
  - Créer l'enum `OutboxStatus` avec les valeurs PENDING, IN_PROGRESS, DONE, FAILED
  - Créer `PhotoOutboxRepository extends JpaRepository<PhotoOutboxEntry, Long>` avec la méthode `findByStatusInAndRetryCountLessThan(List<OutboxStatus> statuses, int maxRetry)`
  - Créer `PhotoOutboxService` avec la méthode `saveFallback(Long clientId, PhotoType type, byte[] bytes)` : écrire les bytes dans `${photo.fallback.path}/{clientId}_{type}_{System.currentTimeMillis()}.jpg` via `Files.write()`, puis créer et sauvegarder une `PhotoOutboxEntry` avec statut PENDING
  - Créer `PhotoOutboxRetryScheduler` annoté `@Component` avec la méthode `retryPendingPhotos()` annotée `@Scheduled(fixedDelay = 300_000)` et `@Transactional` : vérifier `minioStorageService.isAvailable()` → si false, sortir immédiatement ; charger les entrées PENDING ou FAILED avec `retryCount < 5` ; pour chaque entrée : lire le fichier, uploader original + thumbnail via `clientService.uploadSinglePhoto()`, mettre à jour les URLs dans `Client`, supprimer le fichier local, passer le statut à DONE ; en cas d'erreur : incrémenter `retryCount`, mettre à jour `lastAttemptAt` et `errorMessage`, passer à FAILED si `retryCount >= 5` et loguer ERROR
  - Ajouter `@EnableScheduling` sur la classe de configuration principale
  - Écrire les tests unitaires `PhotoOutboxRetrySchedulerTest` : vérifier que le scheduler ne fait rien si MinIO est down, vérifier la transition PENDING → DONE, vérifier la transition PENDING → FAILED après 5 tentatives, vérifier l'invariant `retryCount` (Property 12)
  - **Validates:** Requirement 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9

- [ ] 7. Refactoriser `ClientService` pour utiliser MinIO avec fallback Outbox
  - Injecter `MinioStorageService`, `ImageProcessingService`, et `PhotoOutboxService` dans `ClientService`
  - Implémenter la méthode privée `tryUploadOrFallback(Long clientId, byte[] bytes, PhotoType type)` : tenter l'upload MinIO ; si `isAvailable()` retourne false ou si l'upload échoue, appeler `photoOutboxService.saveFallback(clientId, type, bytes)` et retourner null (URL non disponible immédiatement)
  - Implémenter `uploadClientPhotos(Long clientId, byte[] profilPhotoBytes, byte[] cardPhotoBytes): PhotoUploadResultDto` : appeler `tryUploadOrFallback` pour chaque photo ; mettre à jour les URLs non-null dans `Client` ; retourner `PhotoUploadResultDto` avec les URLs (potentiellement null si en attente outbox)
  - Implémenter `uploadSinglePhoto(Long clientId, byte[] bytes, PhotoType type): String` (appelée par le scheduler) : générer thumbnail → uploader original + thumbnail → retourner l'URL
  - Implémenter `updatePhotoUrl(Long clientId, PhotoType type, String url)` (appelée par le scheduler) : mettre à jour `profilPhotoUrl`/`profilPhotoThumbUrl` ou `cardPhotoUrl`/`cardPhotoThumbUrl` dans `Client`
  - Modifier `addClient(ClientDto)` : après `create(client)`, appeler `uploadClientPhotos` ; supprimer la création de `PhotoStore`
  - Modifier `updateClientPhoto(UpdatePhotoDto)` : remplacer `photoStoreRepository` par `uploadClientPhotos`
  - Modifier `updatePhotosBatch`, `checkMissingPhotos`, `getProfilPhotos`, `getCardPhotos` comme défini dans le design
  - Créer les DTOs `PhotoUploadResultDto` et modifier `ClientPhotoDto`
  - **Validates:** Requirement 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.4, 13.1, 13.2

- [ ] 8. Modifier `ClientController` — nouveaux endpoints et suppression des anciens
  - Ajouter l'endpoint `POST /api/v1/clients/{id}/photos` acceptant `@RequestPart MultipartFile profilPhoto`, `@RequestPart MultipartFile cardPhoto`, `@RequestParam String cardType`, `@RequestParam String cardNumber`
  - Valider le content-type (`image/jpeg`, `image/png`, `image/webp`) et la taille max (10 Mo) avant de passer au service
  - Appeler `clientService.uploadClientPhotos(id, profilPhoto.getBytes(), cardPhoto.getBytes())` et retourner `PhotoUploadResultDto` avec HTTP 200 (les URLs peuvent être null si en attente outbox — c'est normal)
  - Vérifier que `GET /api/v1/clients/{id}` inclut `profilPhotoUrl` dans `ClientRespDto`
  - Vérifier que `GET /api/v1/clients/by-commercial/{username}` retourne `profilPhotoThumbUrl` et `cardPhotoThumbUrl` dans la liste paginée
  - Supprimer ou marquer `@Deprecated` les endpoints `POST /api/v1/clients/profil-photos`, `POST /api/v1/clients/card-photos`, `POST /api/v1/clients/photos-batch-update`
  - **Validates:** Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.3

- [ ] 9. Implémenter `PhotoMigrationJob`
  - Créer l'interface `PhotoMigrationJob` et les records `MigrationReport` et `MigrationStatus` dans `com.optimize.elykia.client.migration`
  - Créer l'implémentation `PhotoMigrationJobImpl` annotée `@Component`
  - Implémenter `runMigration()` : traiter les `PhotoStore` par pages de 10 ; pour chaque `PhotoStore`, si les URLs sont déjà renseignées → skipped ; sinon : générer thumbnail → uploader original + thumbnail → mettre à jour les URLs dans `Client` → migrated ; en cas d'erreur MinIO : loguer, incrémenter errors, continuer ; retourner `MigrationReport { total, migrated, skipped, errors }` avec invariant `total = migrated + skipped + errors`
  - Créer `AdminPhotoMigrationController` avec `POST /api/v1/admin/migrate-photos` et `GET /api/v1/admin/migrate-photos/status` protégés par `@PreAuthorize("hasRole('ADMIN')")`
  - **Validates:** Requirement 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.4

- [ ] 10. Écrire les tests unitaires backend
  - `PhotoObjectKeyBuilderTest` : vérifier les 4 patterns, la distinction original/thumb, la distinction profil/card pour plusieurs `clientId` (jqwik `@Property`)
  - `ImageProcessingServiceTest` : vérifier dimensions ≤ 200×200, magic bytes JPEG `0xFF 0xD8`, conservation du ratio, rejet des bytes invalides
  - `MinioStorageServiceTest` : mock `MinioClient`, vérifier upload/delete/exists, `isAvailable()` retourne false quand MinIO est down, encapsulation des exceptions
  - `PhotoOutboxRetrySchedulerTest` : vérifier que le scheduler ne fait rien si `isAvailable()` = false, vérifier PENDING → DONE, vérifier PENDING → FAILED après 5 tentatives, vérifier invariant `retryCount`
  - `ClientServiceTest` : mock `MinioStorageService` + `ImageProcessingService` + `PhotoOutboxService`, vérifier que `uploadClientPhotos` persiste les URLs quand MinIO est up, vérifier que `tryUploadOrFallback` appelle `photoOutboxService.saveFallback` quand MinIO est down
  - `PhotoMigrationJobTest` : vérifier idempotence, invariant du rapport, gestion des erreurs MinIO
  - **Validates:** Properties 1–12

- [ ] 11. Ajouter le service MinIO et le volume fallback dans les docker-compose de déploiement
  - Dans `deploy/docker-compose.test.yml` : ajouter le service `minio` avec image `minio/minio:latest`, commande `server /data --console-address ":9001"`, variables `MINIO_ROOT_USER` et `MINIO_ROOT_PASSWORD`, volume `minio_data:/data`, réseaux `internal` et `traefik-public`
  - Configurer les labels Traefik pour le service `minio` : router console sur `minio-test.amenouveve-yaveh.com` (port 9001) et router API sur `minio-test-api.amenouveve-yaveh.com` (port 9000), tous deux avec TLS Let's Encrypt
  - Ajouter `minio_data:` dans la section `volumes` du docker-compose test
  - Ajouter dans le service `backend` du docker-compose test les variables : `MINIO_ENDPOINT: http://minio:9000`, `MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}`, `MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}`, `MINIO_BUCKET: ${MINIO_BUCKET:-elykia-clients}`, `MINIO_PUBLIC_URL: ${MINIO_PUBLIC_URL:-https://minio-test-api.amenouveve-yaveh.com}`, `PHOTO_FALLBACK_PATH: /opt/elykia/photos/pending`
  - Ajouter dans le service `backend` le volume de fallback : `${PHOTO_FALLBACK_PATH_HOST:-/opt/elykia/test/photos/pending}:/opt/elykia/photos/pending` pour garantir la persistance des fichiers en attente entre les redémarrages du container
  - Répéter les mêmes modifications dans `deploy/docker-compose.prod.yml` avec les domaines prod
  - **Validates:** Requirement 11.3, 11.4, 11.5, 13.10

- [ ] 12. Mettre à jour la configuration CI/CD et les fichiers .env
  - Mettre à jour `deploy/setup-server.sh` pour créer les répertoires : `/opt/elykia/test/minio`, `/opt/elykia/prod/minio`, `/opt/elykia/test/photos/pending`, `/opt/elykia/prod/photos/pending`
  - Ajouter dans les templates `.env` test et prod les variables : `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL`, `PHOTO_FALLBACK_PATH_HOST`
  - Documenter dans `deploy/README.md` la section MinIO et le mécanisme de fallback outbox
  - Documenter dans `deploy/EXPLOITATION.md` : commandes MinIO, vérification des entrées outbox en attente (`SELECT * FROM photo_outbox_entry WHERE status IN ('PENDING','FAILED')`), procédure de relance manuelle
  - **Validates:** Requirement 10.1, 11.3, 11.4, 11.5, 13.9, 13.10

- [ ] 13. Refactoriser `PhotoSyncService` côté mobile
  - Ouvrir `mobile/src/app/core/services/photo-sync.service.ts`
  - Supprimer les appels aux endpoints `POST /api/v1/clients/profil-photos` et `POST /api/v1/clients/card-photos` qui récupéraient des bytes
  - Modifier `syncPhotosForClients` pour ne plus être appelée depuis `initializeClients` — les URLs sont désormais incluses dans la réponse de `fetchPageAndSave`
  - Implémenter le téléchargement optionnel des thumbnails pour le mode offline : si `profilPhotoThumbUrl` est renseignée et que le fichier local n'existe pas, télécharger via `HttpClient` et sauvegarder dans `Filesystem.writeFile({ path: 'photos/{clientId}_profil_thumb.jpg', data: blob, directory: Directory.Data })`
  - Mettre à jour `profilPhotoThumbUrl` dans SQLite avec le chemin local après téléchargement
  - **Validates:** Requirement 9.1, 9.2, 9.3, 9.4

- [ ] 14. Écrire les tests d'intégration backend (Testcontainers)
  - Ajouter la dépendance Testcontainers `org.testcontainers:minio` dans le scope `test`
  - Créer `PhotoMigrationJobIntegrationTest` : démarrer un container MinIO via Testcontainers, insérer des `PhotoStore` avec des bytes de test, lancer `runMigration()`, vérifier que les objets existent dans MinIO et que les URLs sont renseignées dans `Client`
  - Créer `ClientControllerIntegrationTest` : upload multipart via `MockMvc`, vérifier HTTP 200, présence des objets dans MinIO, URLs en base
  - Créer `PhotoOutboxRetrySchedulerIntegrationTest` : simuler MinIO down lors de `addClient()`, vérifier qu'une `PhotoOutboxEntry` PENDING est créée et que le client est bien enregistré ; redémarrer MinIO (container Testcontainers), déclencher manuellement `retryPendingPhotos()`, vérifier que l'entrée passe à DONE et que les URLs sont renseignées dans `Client`
  - **Validates:** Requirement 1, 4, 7, 13

- [ ] 15. Mettre à jour le service d'upload photo côté mobile
  - Ouvrir `mobile/src/app/core/services/client.service.ts`
  - Modifier `updateClientPhotosAndInfo` pour utiliser le nouvel endpoint `POST /api/v1/clients/{id}/photos` avec `FormData` (multipart) au lieu d'envoyer des bytes base64
  - Construire le `FormData` : `formData.append('profilPhoto', blob, 'profil.jpg')` pour chaque photo présente
  - Mettre à jour les URLs reçues dans la réponse dans SQLite via `clientRepository.updatePhotosAndInfo` (les URLs peuvent être null si en attente outbox — stocker null et laisser la prochaine sync mettre à jour)
  - **Validates:** Requirement 6.1, 9.1

- [ ] 16. Mettre à jour l'affichage des photos dans le frontend Angular
  - Dans `frontend/src/app/client/client-details/client-details.component.ts` : supprimer `loadProfilPhoto()`, `DomSanitizer`, et `safeProfilPhotoUrl: SafeUrl | null` ; alimenter `profilPhotoUrl: string | null` depuis `this.client.profilPhotoUrl` dans `loadClient()`
  - Dans `frontend/src/app/client/components/client-info-card/client-info-card.component.ts` : remplacer `@Input() safeProfilPhotoUrl: SafeUrl | null` par `@Input() profilPhotoUrl: string | null = null`
  - Dans le template `client-info-card.component.html` : `<img [src]="profilPhotoUrl" *ngIf="profilPhotoUrl">` avec fallback avatar initiales si null
  - Dans `frontend/src/app/credit/credit-details/credit-details.component.html` : remplacer l'avatar initiales par `<img [src]="credit.client?.profilPhotoUrl" *ngIf="credit.client?.profilPhotoUrl">` avec fallback initiales
  - Dans `frontend/src/app/client/service/client.service.ts` : supprimer `getProfilPhotoStream(id: number): Observable<Blob>`
  - **Validates:** Requirement 12.1, 12.2, 12.3, 12.4, 12.5, 12.6

- [ ] 17. Créer le script Flyway de nettoyage des colonnes binaires (Phase 2)
  - Créer le script `V{next}__remove_binary_photo_columns.sql` dans le répertoire des migrations Flyway du backend avec le contenu : `ALTER TABLE client DROP COLUMN IF EXISTS profil_photo; ALTER TABLE client DROP COLUMN IF EXISTS i_d_doc; DROP TABLE IF EXISTS photo_store;`
  - Annoter les champs `byte[] profilPhoto` et `byte[] IDDoc` dans `Client.java` avec `@Deprecated`
  - Annoter le champ `byte[] photo` dans `PhotoStore.java` avec `@Deprecated`
  - Ce script est activé (`SPRING_FLYWAY_ENABLED=true`) uniquement après validation complète du job de migration et confirmation que `errors = 0` dans le `MigrationReport` ET que la table `photo_outbox_entry` ne contient plus d'entrées PENDING ou FAILED
  - **Validates:** Requirement 8.1, 8.2, 8.3

## Notes

- **Ordre de déploiement** : déployer T11/T12 (infrastructure MinIO + volumes fallback) avant le backend modifié. Le `@PostConstruct initBucket()` tente de se connecter à MinIO au démarrage — si MinIO est down, le backend démarre quand même mais les uploads iront en outbox.
- **Résilience** : grâce au pattern Outbox (T6), un client peut être enregistré même si MinIO est down. Les photos seront synchronisées automatiquement dès que MinIO sera de nouveau disponible, sans intervention manuelle (sauf après 5 échecs).
- **Surveillance outbox** : monitorer la table `photo_outbox_entry` via la requête `SELECT status, COUNT(*) FROM photo_outbox_entry GROUP BY status` pour détecter des accumulations anormales.
- **T17 (Flyway)** : activer uniquement après `errors = 0` dans le MigrationReport ET `SELECT COUNT(*) FROM photo_outbox_entry WHERE status IN ('PENDING','FAILED') = 0`.
- **DNS Cloudflare** : ajouter les enregistrements A pour `minio-test`, `minio-test-api`, `minio`, `minio-api` avant le déploiement de T11.
- **Backup** : inclure les volumes `minio_data` ET les répertoires `photos/pending` dans la stratégie de backup.
