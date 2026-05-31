# Plan d'implémentation : Client Photo MinIO Storage

## Vue d'ensemble

Migration du stockage des photos clients depuis la base de données relationnelle (`byte[]` dans `Client` et `PhotoStore`) vers MinIO (stockage objet compatible S3). Le plan couvre : les nouvelles dépendances, les services backend (MinioStorageService, ImageProcessingService, PhotoObjectKeyBuilder), la modification de ClientService et ClientController, le job de migration, la modification du mobile (PhotoSyncService), et la suppression des colonnes binaires via Flyway.

## Tâches

- [ ] 1. Backend — Ajout des dépendances Maven
  - [ ] 1.1 Ajouter `io.minio:minio:8.5.7` et `net.coobird:thumbnailator:0.4.20` dans le `pom.xml` du module `elykia-client`
    - Ajouter la dépendance MinIO SDK Java dans la section `<dependencies>`
    - Ajouter la dépendance Thumbnailator dans la section `<dependencies>`
    - _Requirements: 11.1, 11.2_

- [ ] 2. Backend — Configuration Spring Boot
  - [ ] 2.1 Ajouter les propriétés MinIO dans `application.yml` et créer la classe `MinioProperties`
    - Ajouter le bloc `minio:` dans `application.yml` avec `endpoint`, `access-key`, `secret-key`, `bucket`, `public-url` lus depuis les variables d'environnement
    - Créer la classe `@ConfigurationProperties(prefix = "minio") MinioProperties` avec les champs correspondants
    - _Requirements: 10.1, 10.5_

- [ ] 3. Backend — PhotoObjectKeyBuilder
  - [ ] 3.1 Créer la classe utilitaire `PhotoObjectKeyBuilder`
    - Implémenter `profilOriginal(Long clientId): String` → `"clients/{clientId}/profil/original.jpg"`
    - Implémenter `profilThumb(Long clientId): String` → `"clients/{clientId}/profil/thumb.jpg"`
    - Implémenter `cardOriginal(Long clientId): String` → `"clients/{clientId}/card/original.jpg"`
    - Implémenter `cardThumb(Long clientId): String` → `"clients/{clientId}/card/thumb.jpg"`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.2 Écrire les tests de propriétés jqwik pour `PhotoObjectKeyBuilder`
    - **Propriété 3 : Clés d'objets distinctes (original vs thumbnail)**
    - `@Property` : pour tout `clientId` Long, `profilOriginal(id) != profilThumb(id)` et `cardOriginal(id) != cardThumb(id)`, 200 itérations
    - **Propriété 4 : Clés d'objets distinctes (profil vs carte)**
    - `@Property` : pour tout `clientId` Long, `profilOriginal(id) != cardOriginal(id)` et `profilThumb(id) != cardThumb(id)`, 200 itérations
    - **Propriété 5 : Pattern des clés d'objets MinIO**
    - `@Property` : pour tout `clientId` Long, les quatre clés respectent le pattern `clients/{clientId}/{type}/{variant}.jpg`, 200 itérations
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

- [ ] 4. Backend — ImageProcessingService
  - [ ] 4.1 Créer l'interface `ImageProcessingService` et son implémentation `ImageProcessingServiceImpl`
    - Déclarer `byte[] generateThumbnail(byte[] original, int width, int height)`
    - Implémenter avec Thumbnailator : `Thumbnails.of(new ByteArrayInputStream(original)).size(width, height).outputFormat("JPEG").outputQuality(0.8).toOutputStream(baos)`
    - Conserver le ratio d'aspect (fit dans width×height sans déformation)
    - Accepter les formats JPEG, PNG, WebP en entrée
    - Lever `ApplicationException("Format d'image non supporté ou fichier corrompu")` si les bytes sont null, vides ou invalides
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.2 Écrire les tests de propriétés jqwik pour `ImageProcessingService`
    - **Propriété 1 : Thumbnail dimensions respectées**
    - `@Property` : pour tout tableau de bytes d'image valide, `generateThumbnail(bytes, 200, 200)` retourne une image dont largeur ≤ 200 et hauteur ≤ 200, 100 itérations
    - **Propriété 2 : Thumbnail encodé en JPEG**
    - `@Property` : pour tout tableau de bytes d'image valide, les deux premiers octets du résultat sont `0xFF 0xD8`, 100 itérations
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 4.3 Écrire les tests unitaires JUnit 5 pour les cas limites de `ImageProcessingService`
    - Cas : bytes null → `ApplicationException`
    - Cas : bytes vides → `ApplicationException`
    - Cas : bytes corrompus (non-image) → `ApplicationException`
    - Cas : image portrait (100×300) → thumbnail ≤ 200×200 avec ratio conservé
    - Cas : image paysage (300×100) → thumbnail ≤ 200×200 avec ratio conservé
    - _Requirements: 2.3, 2.5_

- [ ] 5. Backend — MinioStorageService
  - [ ] 5.1 Créer l'interface `MinioStorageService` et son implémentation `MinioStorageServiceImpl`
    - Déclarer `String uploadPhoto(String objectKey, byte[] data, String contentType)`
    - Déclarer `void deletePhoto(String objectKey)`
    - Déclarer `boolean exists(String objectKey)`
    - Implémenter avec le SDK MinIO Java (`io.minio.MinioClient`)
    - Initialiser `MinioClient` depuis `MinioProperties` dans le constructeur
    - Créer le bucket `elykia-clients` s'il n'existe pas dans `@PostConstruct`
    - Retourner l'URL publique construite : `{minio.public-url}/{minio.bucket}/{objectKey}`
    - Encapsuler toutes les exceptions MinIO dans `ApplicationException`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.2 Écrire les tests de propriétés jqwik pour `MinioStorageService` (avec mock MinIO SDK)
    - **Propriété 6 : Upload retourne une URL non nulle et non vide**
    - `@Property` : pour tout `objectKey` non vide et bytes non vides, `uploadPhoto` retourne une chaîne non nulle et non vide, 100 itérations
    - **Propriété 7 : Round-trip upload/exists**
    - `@Property` : après `uploadPhoto(key, data, ct)`, `exists(key)` retourne `true`, 100 itérations
    - **Propriété 8 : Round-trip upload/delete/exists**
    - `@Property` : après `uploadPhoto` puis `deletePhoto`, `exists(key)` retourne `false`, 100 itérations
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]* 5.3 Écrire les tests unitaires JUnit 5 pour `MinioStorageService`
    - Mock du `MinioClient` SDK
    - Vérifier que `uploadPhoto` appelle `putObject` avec les bons paramètres
    - Vérifier que `deletePhoto` appelle `removeObject`
    - Vérifier que les exceptions MinIO sont encapsulées en `ApplicationException`
    - _Requirements: 4.7_

- [ ] 6. Checkpoint — Vérifier que les tests des services de base passent
  - S'assurer que tous les tests de `PhotoObjectKeyBuilder`, `ImageProcessingService` et `MinioStorageService` passent. Demander à l'utilisateur si des questions se posent.

- [ ] 7. Backend — Modification de ClientService
  - [ ] 7.1 Injecter `MinioStorageService` et `ImageProcessingService` dans `ClientService`
    - Ajouter les deux services comme paramètres du constructeur
    - _Requirements: 5.1_

  - [ ] 7.2 Implémenter `uploadClientPhotos(Long clientId, byte[] profilPhotoBytes, byte[] cardPhotoBytes): PhotoUploadResultDto`
    - Annoter `@Transactional`
    - Si `profilPhotoBytes` non null et non vide : générer thumbnail, uploader original et thumbnail vers MinIO via `PhotoObjectKeyBuilder`, récupérer les URLs
    - Si `cardPhotoBytes` non null et non vide : idem pour la carte
    - Mettre à jour les champs `profilPhotoUrl`, `cardPhotoUrl`, `profilPhotoThumbUrl`, `cardPhotoThumbUrl` dans l'entité `Client`
    - Retourner `PhotoUploadResultDto` avec les quatre URLs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.6_

  - [ ] 7.3 Modifier `addClient(ClientDto)` pour utiliser MinIO au lieu de `PhotoStore`
    - Après `create(client)`, si des bytes de photo sont présents dans le DTO, appeler `uploadClientPhotos`
    - Ne plus créer de `PhotoStore` dans cette méthode
    - _Requirements: 5.1_

  - [ ] 7.4 Modifier `updateClientPhoto(UpdatePhotoDto)` pour utiliser MinIO
    - Remplacer les appels `photoStoreRepository.updateProfil/updateCard` par `uploadClientPhotos`
    - _Requirements: 5.2_

  - [ ] 7.5 Modifier `checkMissingPhotos(List<Long>)` pour vérifier les URLs dans `Client`
    - Remplacer la lecture des bytes depuis `PhotoStore` par la vérification de `client.profilPhotoUrl` et `client.cardPhotoUrl`
    - _Requirements: 5.3_

  - [ ] 7.6 Modifier `getProfilPhotos(List<Long>)` et `getCardPhotos(List<Long>)` pour retourner des URLs
    - Retourner les URLs thumbnail depuis `Client` au lieu des bytes depuis `PhotoStore`
    - Adapter `ClientPhotoDto` pour retourner `photoUrl` et `thumbUrl` au lieu de `byte[] photo`
    - _Requirements: 5.4, 5.5, 8.4_

  - [ ]* 7.7 Écrire les tests de propriétés jqwik pour `ClientService.uploadClientPhotos`
    - **Propriété 9 : uploadClientPhotos retourne des URLs non nulles**
    - `@Property` : pour tout `clientId` valide et bytes non vides, le `PhotoUploadResultDto` retourné a tous ses champs URL non nuls et non vides, 100 itérations (mock `MinioStorageService` et `ImageProcessingService`)
    - **Validates: Requirements 1.3, 1.4, 5.6**

  - [ ]* 7.8 Écrire les tests unitaires JUnit 5 pour `ClientService`
    - Mock de `MinioStorageService` et `ImageProcessingService`
    - Vérifier que les URLs sont correctement persistées dans `Client` après `uploadClientPhotos`
    - Vérifier que `ApplicationException` est propagée si MinIO est indisponible (HTTP 503)
    - _Requirements: 1.5_

- [ ] 8. Backend — Modification de ClientController
  - [ ] 8.1 Ajouter l'endpoint `POST /api/v1/clients/{id}/photos`
    - Accepter `multipart/form-data` avec les parts optionnelles `profilPhoto` (`MultipartFile`), `cardPhoto` (`MultipartFile`), `cardType` (`String`), `cardNumber` (`String`)
    - Valider le content-type (image/jpeg, image/png, image/webp) et la taille maximale (10 Mo) avant traitement
    - Appeler `clientService.uploadClientPhotos(id, profilBytes, cardBytes)`
    - Retourner HTTP 200 avec `PhotoUploadResultDto`
    - _Requirements: 6.1, 6.2, 10.3_

  - [ ] 8.2 Vérifier que `GET /api/v1/clients/{id}` inclut `profilPhotoUrl` dans `ClientRespDto`
    - S'assurer que `ClientRespDto.fromClient(client)` mappe `profilPhotoUrl` et `cardPhotoUrl`
    - _Requirements: 6.3_

  - [ ] 8.3 Vérifier que `GET /api/v1/clients/by-commercial/{username}` inclut uniquement les URLs thumbnail dans la liste
    - S'assurer que la projection/DTO de liste inclut `profilPhotoThumbUrl` et `cardPhotoThumbUrl` mais pas les bytes
    - _Requirements: 6.4_

  - [ ] 8.4 Supprimer ou déprécier les anciens endpoints de photos en bytes
    - Supprimer `POST /api/v1/clients/profil-photos`, `POST /api/v1/clients/card-photos`, `POST /api/v1/clients/photos-batch-update`
    - _Requirements: 6.5, 6.6_

- [ ] 9. Backend — PhotoMigrationJob
  - [ ] 9.1 Créer l'interface `PhotoMigrationJob` et son implémentation `PhotoMigrationJobImpl`
    - Déclarer `MigrationReport runMigration()` et `MigrationStatus getStatus()`
    - Créer le record `MigrationReport(int total, int migrated, int skipped, int errors)`
    - Implémenter `runMigration()` : traiter les clients par pages de 10 via `ClientRepository.findAll(Pageable)`
    - Pour chaque client : si `profilPhotoUrl` et `cardPhotoUrl` sont déjà renseignées → incrémenter `skipped` et continuer
    - Sinon : lire les bytes depuis `PhotoStoreRepository`, générer thumbnails, uploader vers MinIO, mettre à jour les URLs dans `Client` de manière atomique
    - Si l'upload échoue pour un client : loguer l'erreur, incrémenter `errors`, continuer
    - Garantir `total = migrated + skipped + errors` dans le rapport final
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 9.2 Ajouter les endpoints admin dans un `PhotoMigrationController`
    - `POST /api/v1/admin/migrate-photos` → appelle `runMigration()`, protégé par `@PreAuthorize("hasRole('ADMIN')")`
    - `GET /api/v1/admin/migrate-photos/status` → appelle `getStatus()`, protégé par `@PreAuthorize("hasRole('ADMIN')")`
    - _Requirements: 7.1, 7.7, 10.4_

  - [ ]* 9.3 Écrire les tests de propriétés jqwik pour `PhotoMigrationJob`
    - **Propriété 10 : Idempotence du job de migration**
    - `@Property` : pour tout ensemble de clients avec URLs déjà renseignées, exécuter `runMigration()` deux fois produit `migrated = 0, skipped = total`, 50 itérations (mock MinIO)
    - **Propriété 11 : Invariant du MigrationReport**
    - `@Property` : pour tout ensemble de clients, `report.total() == report.migrated() + report.skipped() + report.errors()`, 100 itérations
    - **Validates: Requirements 7.3, 7.6**

  - [ ]* 9.4 Écrire les tests d'intégration pour `PhotoMigrationJob` avec Testcontainers
    - Utiliser `minio/minio` via Testcontainers
    - Vérifier la migration complète d'un jeu de données de test (clients avec bytes dans `PhotoStore`)
    - Vérifier que les objets sont présents dans MinIO après migration
    - Vérifier que les URLs sont renseignées dans `Client` après migration
    - _Requirements: 7.2, 7.4_

- [ ] 10. Checkpoint — Vérifier que tous les tests backend passent
  - S'assurer que tous les tests unitaires et de propriétés backend passent. Demander à l'utilisateur si des questions se posent.

- [ ] 11. Backend — Dépréciation des champs binaires dans Client et PhotoStore
  - [ ] 11.1 Annoter `@Deprecated` les champs `byte[] profilPhoto` et `byte[] IDDoc` dans l'entité `Client`
    - Ajouter `@Deprecated` sur les deux champs
    - S'assurer que `@JsonIgnore` est présent sur `IDDoc` (déjà présent)
    - Ajouter `@JsonIgnore` sur `profilPhoto` pour exclure de la sérialisation JSON
    - _Requirements: 8.1_

  - [ ] 11.2 Annoter `@Deprecated` le champ `byte[] photo` dans l'entité `PhotoStore`
    - Ajouter `@Deprecated` sur le champ `photo`
    - _Requirements: 8.1_

- [ ] 12. Mobile — Modification de PhotoSyncService
  - [ ] 12.1 Modifier `PhotoSyncService` pour ne plus appeler les endpoints batch de photos en bytes
    - Supprimer les appels à `POST /api/v1/clients/profil-photos` et `POST /api/v1/clients/card-photos`
    - Supprimer les appels à `POST /api/v1/clients/photos-batch-update`
    - _Requirements: 9.1, 9.2_

  - [ ] 12.2 Vérifier que `fetchPageAndSave` dans `ClientService` persiste correctement les URLs MinIO dans SQLite
    - S'assurer que les champs `profilPhotoThumbUrl` et `cardPhotoThumbUrl` reçus dans la réponse API sont bien persistés dans SQLite
    - Aucune modification de schéma SQLite nécessaire (colonnes déjà présentes)
    - _Requirements: 9.1, 9.4_

  - [ ] 12.3 Mettre à jour `updateClientPhotosAndInfo` dans `ClientService` mobile pour uploader via le nouvel endpoint multipart
    - Remplacer l'envoi de bytes base64 par un appel `POST /api/v1/clients/{id}/photos` en multipart/form-data
    - _Requirements: 9.1_

- [ ] 13. Checkpoint — Vérifier que les modifications mobile compilent et fonctionnent
  - S'assurer que le mobile compile sans erreur et que la synchronisation des clients fonctionne. Demander à l'utilisateur si des questions se posent.

- [ ] 14. Backend — Migration Flyway de nettoyage (Phase 2 — après validation)
  - [ ] 14.1 Créer le script Flyway de suppression des colonnes binaires
    - Créer `V{next}__remove_binary_photo_columns.sql` dans le répertoire des migrations Flyway
    - Contenu : `ALTER TABLE client DROP COLUMN IF EXISTS profil_photo; ALTER TABLE client DROP COLUMN IF EXISTS i_d_doc; DROP TABLE IF EXISTS photo_store;`
    - **⚠️ Ce script ne doit être exécuté qu'après validation complète de la migration MinIO (toutes les URLs renseignées)**
    - _Requirements: 8.2, 8.3_

- [ ] 15. Tests d'intégration — Flux complet upload et migration
  - [ ]* 15.1 Écrire le test d'intégration `ClientControllerIntegrationTest` avec Testcontainers
    - Utiliser `minio/minio` et une base PostgreSQL via Testcontainers
    - Flux : `POST /api/v1/clients/{id}/photos` avec un fichier JPEG → vérifier présence des 4 objets dans MinIO → vérifier URLs en base
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 15.2 Écrire le test d'intégration `PhotoMigrationJobIntegrationTest` avec Testcontainers
    - Préparer des clients avec bytes dans `PhotoStore`
    - Exécuter `runMigration()`
    - Vérifier que les objets sont présents dans MinIO
    - Vérifier que les URLs sont renseignées dans `Client`
    - Vérifier l'idempotence (deuxième exécution → `migrated = 0`)
    - _Requirements: 7.2, 7.3, 7.4, 7.6_

- [ ] 16. Checkpoint final — Vérifier que tous les tests passent
  - S'assurer que tous les tests unitaires, de propriétés et d'intégration (backend et mobile) passent. Demander à l'utilisateur si des questions se posent.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Chaque tâche référence les requirements spécifiques pour la traçabilité
- Les tests de propriétés utilisent **jqwik** (JUnit 5) côté backend Java
- La tâche 14 (migration Flyway Phase 2) doit être exécutée **après** validation complète que toutes les URLs sont renseignées en production
- L'ordre des tâches respecte les dépendances : dépendances → config → utilitaires → services → controller → job → mobile → nettoyage
- Le schéma SQLite mobile n'a pas besoin d'être modifié (colonnes URL déjà présentes)
- Les credentials MinIO ne doivent jamais être committés dans le code source
