# Plan d'implémentation : Gestion des Reliquats de Recouvrement

## Vue d'ensemble

Implémentation de la gestion des reliquats de recouvrement en TypeScript/Angular (mobile Ionic, SQLite local-first) et Java/Spring Boot (backend PostgreSQL). Le flux couvre la migration des bases de données, la logique métier mobile (calcul du plan, persistance, UI), la comptabilité journalière avec anti-double comptage, et la synchronisation bidirectionnelle avec le backend.

## Tâches

- [ ] 1. Mobile — Migration SQLite v22
  - [ ] 1.1 Créer la migration SQLite v22 dans le service de base de données mobile
    - Créer la table `client_reliquats` avec les colonnes : `id TEXT PRIMARY KEY`, `clientId TEXT NOT NULL`, `commercialId TEXT NOT NULL`, `totalAmount REAL NOT NULL DEFAULT 0`, `lastRecoveryId TEXT`, `createdAt TEXT NOT NULL`, `updatedAt TEXT NOT NULL`, `lastAccountedDate TEXT`, `isSync INTEGER DEFAULT 0`, `syncDate TEXT`, `FOREIGN KEY(clientId) REFERENCES clients(id)`
    - Créer les index `idx_client_reliquats_clientId` et `idx_client_reliquats_commercialId`
    - Ajouter les colonnes `reliquatGeneratedAmount REAL DEFAULT 0` et `reliquatUsedAmount REAL DEFAULT 0` à la table `recoveries`
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 2. Mobile — Interfaces TypeScript
  - [ ] 2.1 Créer les interfaces `ClientReliquat`, `RecoveryPlan` et étendre `Recovery`
    - Créer `ClientReliquat` avec les champs : `id`, `clientId`, `commercialId`, `totalAmount`, `lastRecoveryId?`, `createdAt`, `updatedAt`, `lastAccountedDate?`, `isSync`, `syncDate?`
    - Créer `RecoveryPlan` avec les champs : `misesCount`, `amountCovered`, `reliquatUsed`, `reliquatGenerated`, `cashNeeded`
    - Étendre l'interface `Recovery` existante avec `reliquatGeneratedAmount: number` et `reliquatUsedAmount: number`
    - _Requirements: 1.3, 1.4, 1.5, 3.1_

- [ ] 3. Mobile — `ReliquatRepository`
  - [ ] 3.1 Créer `ReliquatRepository` avec les méthodes CRUD SQLite sur `client_reliquats`
    - Implémenter `findByClientId(clientId: string): Promise<ClientReliquat | null>`
    - Implémenter `upsert(reliquat: ClientReliquat): Promise<void>` — logique 1 ligne max par client
    - Implémenter `findByCommercialId(commercialId: string): Promise<ClientReliquat[]>`
    - Implémenter `findUnsynced(commercialId: string): Promise<ClientReliquat[]>`
    - Implémenter `markAsSynced(id: string): Promise<void>` — met à jour `isSync = 1` et `syncDate`
    - Implémenter `findCreatedOnDate(commercialId: string, date: string): Promise<ClientReliquat[]>`
    - _Requirements: 3.4, 6.3, 7.3_

- [ ] 4. Mobile — `ReliquatService` (logique métier)
  - [ ] 4.1 Créer `ReliquatService` avec `computeRecoveryPlan()` et les méthodes de gestion du cycle de vie
    - Implémenter `computeRecoveryPlan(received, stake, existingReliquat, useReliquat): RecoveryPlan` selon l'algorithme du design : `effectiveAmount = useReliquat ? received + existingReliquat : received`, `misesCount = Math.floor(effectiveAmount / stake)`, `reliquatUsed = useReliquat ? Math.min(existingReliquat, amountCovered - Math.floor(received / stake) * stake) : 0`, `reliquatGenerated = effectiveAmount - amountCovered`, `cashNeeded = received`
    - Implémenter `getReliquatForClient(clientId: string): Promise<ClientReliquat | null>` via `ReliquatRepository.findByClientId`
    - Implémenter `addReliquat(clientId: string, amount: number, recoveryId: string): Promise<void>` — upsert avec accumulation de `totalAmount`
    - Implémenter `consumeReliquat(clientId: string, amount: number): Promise<void>` — déduction de `totalAmount`, garantir `totalAmount >= 0`
    - Implémenter `getReliquatsForAccounting(commercialId: string, date: string): Promise<ReliquatAccountingEntry[]>`
    - Implémenter `getUnsynced(commercialId: string): Promise<ClientReliquat[]>` et `markAsSynced(id: string): Promise<void>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 3.3, 3.5, 5.1_

  - [ ]* 4.2 Écrire le test de propriété fast-check pour la Propriété 1 (cashNeeded = received)
    - `// Feature: recovery-reliquat-management, Property 1: cashNeeded est toujours égal à received`
    - `fc.assert(fc.property(fc.integer({ min: 0 }), fc.integer({ min: 1 }), fc.integer({ min: 0 }), fc.boolean(), ...))`
    - Vérifier que `plan.cashNeeded === received` pour toute combinaison valide, 200 itérations
    - **Propriété 1 : cashNeeded est toujours égal à received**
    - **Valide : Requirements 1.5**

  - [ ]* 4.3 Écrire le test de propriété fast-check pour la Propriété 2 (amountCovered = misesCount × stake)
    - `// Feature: recovery-reliquat-management, Property 2: amountCovered est un multiple exact de stake`
    - Vérifier que `plan.amountCovered === plan.misesCount * stake` pour toute combinaison valide, 200 itérations
    - **Propriété 2 : amountCovered est un multiple exact de stake**
    - **Valide : Requirements 1.3**

  - [ ]* 4.4 Écrire le test de propriété fast-check pour la Propriété 3 (reliquatUsed <= existingReliquat)
    - `// Feature: recovery-reliquat-management, Property 3: reliquatUsed ne dépasse jamais existingReliquat`
    - Vérifier que `plan.reliquatUsed <= existingReliquat` pour toute combinaison valide, 200 itérations
    - **Propriété 3 : reliquatUsed ne dépasse jamais existingReliquat**
    - **Valide : Requirements 1.6**

  - [ ]* 4.5 Écrire le test de propriété fast-check pour la Propriété 4 (reliquatGenerated >= 0)
    - `// Feature: recovery-reliquat-management, Property 4: reliquatGenerated est toujours non négatif`
    - Vérifier que `plan.reliquatGenerated >= 0` pour toute combinaison valide, 200 itérations
    - **Propriété 4 : reliquatGenerated est toujours non négatif**
    - **Valide : Requirements 1.4**

  - [ ]* 4.6 Écrire le test de propriété fast-check pour la Propriété 5 (conservation de la valeur totale)
    - `// Feature: recovery-reliquat-management, Property 5: conservation de la valeur totale (useReliquat = true)`
    - Vérifier que `received + plan.reliquatUsed === plan.amountCovered + plan.reliquatGenerated` quand `useReliquat = true`, 200 itérations
    - **Propriété 5 : Conservation de la valeur totale**
    - **Valide : Requirements 1.1, 1.3, 1.4, 1.6**

  - [ ]* 4.7 Écrire le test de propriété fast-check pour la Propriété 6 (useReliquat = false implique reliquatUsed = 0)
    - `// Feature: recovery-reliquat-management, Property 6: useReliquat = false implique reliquatUsed = 0`
    - Vérifier que `plan.reliquatUsed === 0` quand `useReliquat = false`, pour toute combinaison valide, 200 itérations
    - **Propriété 6 : useReliquat = false implique reliquatUsed = 0**
    - **Valide : Requirements 1.2, 2.7**

  - [ ]* 4.8 Écrire les tests unitaires Jest pour `consumeReliquat` (non-négativité) et les cas limites de `computeRecoveryPlan`
    - Vérifier que `totalAmount` ne devient jamais négatif après `consumeReliquat` (cas : consommation exacte, consommation partielle)
    - Vérifier les 5 exemples du tableau de validation du design (received=500/stake=350/reliquat=0, etc.)
    - Vérifier le cas `misesCount = 0` avec `existingReliquat = 0` → plan invalide
    - Vérifier le cas `received + existingReliquat >= stake` → plan valide avec `misesCount >= 1`
    - _Requirements: 1.7, 1.8, 3.5_

- [ ] 5. Checkpoint — Vérifier que les tests du `ReliquatService` passent
  - S'assurer que tous les tests unitaires et de propriétés du `ReliquatService` passent. Demander à l'utilisateur si des questions se posent.

- [ ] 6. Mobile — `ReliquatDisplayComponent`
  - [ ] 6.1 Créer le composant `ReliquatDisplayComponent` avec ses inputs/outputs et son template
    - Déclarer les inputs : `@Input() clientReliquat: ClientReliquat | null`, `@Input() recoveryPlan: RecoveryPlan | null`, `@Input() stakeAmount: number`
    - Déclarer les outputs : `@Output() useReliquatChanged = new EventEmitter<boolean>()`, `@Output() keepReliquatChanged = new EventEmitter<boolean>()`
    - Afficher le montant du reliquat existant (0 FCFA si null)
    - Afficher la checkbox "Utiliser le reliquat" cochée par défaut, visible uniquement si `clientReliquat.totalAmount > 0`
    - Afficher la checkbox "Conserver le reliquat" cochée par défaut, visible uniquement si `recoveryPlan.reliquatGenerated > 0`
    - Afficher le plan calculé : mises couvertes, reliquat utilisé, reliquat généré, montant à verser
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ] 7. Mobile — Intégration dans `RecoveryPage`
  - [ ] 7.1 Modifier `RecoveryPage` pour intégrer `ReliquatDisplayComponent` et le recalcul en temps réel
    - Charger le reliquat du client via `ReliquatService.getReliquatForClient(clientId)` à l'initialisation
    - Intégrer `<app-reliquat-display>` dans le template avec binding des inputs/outputs
    - Recalculer le plan en temps réel à chaque modification du montant saisi via `computeRecoveryPlan()`
    - Gérer les événements `useReliquatChanged` et `keepReliquatChanged` pour mettre à jour l'état local
    - Désactiver le bouton de confirmation si `misesCount = 0` et `existingReliquat = 0`
    - Afficher un toast récapitulatif après confirmation réussie (mises enregistrées, reliquat utilisé/conservé)
    - _Requirements: 1.7, 2.1, 2.6, 2.7, 2.8, 3.6, 3.7_

- [ ] 8. Mobile — Modification de `RecoveryService`
  - [ ] 8.1 Modifier `RecoveryService` pour persister les champs reliquat et orchestrer les appels au `ReliquatService`
    - Sauvegarder le recouvrement avec `reliquatGeneratedAmount` et `reliquatUsedAmount` dans la table `recoveries`
    - Appeler `ReliquatService.addReliquat(clientId, reliquatGenerated, recoveryId)` si `keepReliquat = true` et `reliquatGenerated > 0`
    - Appeler `ReliquatService.consumeReliquat(clientId, reliquatUsed)` si `reliquatUsed > 0`
    - Garantir l'atomicité transactionnelle : annuler le recouvrement si la sauvegarde du reliquat SQLite échoue
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ] 9. Mobile — Modification de `CreditDetailsPage`
  - [ ] 9.1 Modifier `CreditDetailsPage` pour afficher le reliquat courant du client
    - Appeler `ReliquatService.getReliquatForClient(clientId)` lors du chargement de la page
    - Afficher le montant du reliquat avec son libellé si `totalAmount > 0`
    - Afficher "0 FCFA" ou masquer la section si le client n'a pas de reliquat
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10. Mobile — Modification de `RapportJournalierService`
  - [ ] 10.1 Modifier `RapportJournalierService` pour calculer `reliquatNetDuJour` avec anti-double comptage
    - Calculer `reliquatNetDuJour = Σ(reliquats générés à la date J) - Σ(reliquats déjà comptabilisés avant la date J)` via `ReliquatRepository.findCreatedOnDate`
    - Exclure les reliquats avec `lastAccountedDate = J-1` (déjà versés)
    - Inclure les reliquats avec `lastAccountedDate = null` ou `lastAccountedDate = J`
    - Mettre à jour `lastAccountedDate` à la date J pour tous les reliquats inclus dans le calcul
    - Intégrer `reliquatNetDuJour` dans `totalAmountToDeposit` : `totalAmountToDeposit = collectionsAmount + tontineCollectionsAmount + advancesAmount + reliquatNetDuJour`
    - Garantir que `reliquatNetDuJour >= 0`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 10.2 Écrire le test de propriété fast-check pour la Propriété 9 (reliquatNet <= reliquatBrut)
    - `// Feature: recovery-reliquat-management, Property 9: reliquatNet du jour est inférieur ou égal au reliquat brut`
    - Générer une liste de reliquats avec des `lastAccountedDate` variés (null, J, J-1, J-2)
    - Vérifier que `reliquatNetDuJour <= Σ(reliquats générés à J)` pour toute combinaison, 200 itérations
    - **Propriété 9 : reliquatNet du jour est inférieur ou égal au reliquat brut**
    - **Valide : Requirements 4.1, 4.6**

  - [ ]* 10.3 Écrire les tests unitaires Jest pour l'anti-double comptage
    - Cas : reliquat avec `lastAccountedDate = J-1` → exclu du calcul
    - Cas : reliquat avec `lastAccountedDate = null` → inclus dans le calcul
    - Cas : reliquat avec `lastAccountedDate = J` → inclus dans le calcul
    - Vérifier la mise à jour de `lastAccountedDate` après génération du rapport
    - _Requirements: 4.3, 4.4, 4.5_

- [ ] 11. Checkpoint — Vérifier que tous les tests mobile passent
  - S'assurer que tous les tests unitaires et de propriétés mobile passent. Demander à l'utilisateur si des questions se posent.

- [ ] 12. Mobile — Modification de `SynchronizationService`
  - [ ] 12.1 Modifier `SynchronizationService` pour envoyer les recouvrements enrichis et les reliquats non synchronisés
    - Enrichir le `SpecialDailyStakeUnitDto` envoyé via `POST /api/v1/mobiles/special-daily-stake` avec `reliquatGeneratedAmount` et `reliquatUsedAmount`
    - Récupérer les reliquats non synchronisés via `ReliquatService.getUnsynced(commercialId)`
    - Envoyer les reliquats via `POST /api/v1/mobiles/reliquats` avec un `ReliquatSyncDto` regroupant tous les reliquats du commercial en un seul appel
    - Marquer les reliquats synchronisés avec succès via `ReliquatService.markAsSynced(id)` (`isSync = true`, `syncDate = now`)
    - Conserver `isSync = false` en cas d'échec et retenter à la prochaine session
    - Marquer le reliquat comme `syncFailed` si le backend retourne 404 (client inconnu)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [ ] 12.2 Modifier `SynchronizationService` pour récupérer les reliquats à l'initialisation
    - Appeler `GET /api/v1/mobiles/reliquats/{commercialId}` lors de l'initialisation de l'application
    - Persister les reliquats reçus localement via `ReliquatRepository.upsert` (upsert par `clientId`)
    - _Requirements: 7.1, 7.3_

- [ ] 13. Backend — Migration Flyway V36
  - [ ] 13.1 Créer le script de migration Flyway V36
    - Créer la table `client_reliquat` avec les colonnes : `id BIGSERIAL PRIMARY KEY`, `client_id BIGINT NOT NULL`, `commercial_username VARCHAR(255) NOT NULL`, `total_amount DECIMAL(15,2) NOT NULL DEFAULT 0`, `last_recovery_reference VARCHAR(255)`, `last_accounted_date DATE`, `created_date TIMESTAMP NOT NULL DEFAULT NOW()`, `last_modified_date TIMESTAMP NOT NULL DEFAULT NOW()`, `CONSTRAINT fk_client_reliquat_client FOREIGN KEY (client_id) REFERENCES client(id)`
    - Créer les index `idx_client_reliquat_client_id` et `idx_client_reliquat_commercial`
    - Ajouter les colonnes `reliquat_generated_amount DECIMAL(15,2) DEFAULT 0` et `reliquat_used_amount DECIMAL(15,2) DEFAULT 0` à la table `credit_timeline`
    - Ajouter la colonne `total_reliquat_amount DECIMAL(15,2) DEFAULT 0` à la table `daily_commercial_report`
    - _Requirements: 8.4, 8.5, 8.6_

- [ ] 14. Backend — Entité `ClientReliquat` et `ClientReliquatRepository`
  - [ ] 14.1 Créer l'entité JPA `ClientReliquat` et son repository
    - Créer l'entité `ClientReliquat` avec `@Entity`, `@ManyToOne` vers `Client`, champs `commercialUsername`, `totalAmount`, `lastRecoveryReference`, `lastAccountedDate`
    - Créer `ClientReliquatRepository` étendant `JpaRepository<ClientReliquat, Long>`
    - Ajouter la méthode `findByClientId(Long clientId): Optional<ClientReliquat>`
    - Ajouter la méthode `findByCommercialUsername(String username): List<ClientReliquat>`
    - Ajouter la méthode `findByCommercialUsernameAndTotalAmountGreaterThan(String username, Double amount): List<ClientReliquat>`
    - _Requirements: 6.5, 7.2_

- [ ] 15. Backend — `ClientReliquatService`
  - [ ] 15.1 Créer `ClientReliquatService` avec logique upsert et validation
    - Implémenter `upsert(ReliquatSyncUnitDto dto, String commercialUsername): ClientReliquat` — créer ou mettre à jour la ligne par `clientId`
    - Valider que `reliquatUsedAmount <= totalAmount` du reliquat existant avant toute mise à jour
    - Rejeter la mise à jour et retourner une erreur de validation si `reliquatUsedAmount > totalAmount`
    - _Requirements: 9.1, 9.2_

- [ ] 16. Backend — Enrichissement de `SpecialDailyStakeUnitDto` et `CreditTimelineService`
  - [ ] 16.1 Ajouter les champs `reliquatGeneratedAmount` et `reliquatUsedAmount` à `SpecialDailyStakeUnitDto`
    - Ajouter `private Double reliquatGeneratedAmount = 0.0` et `private Double reliquatUsedAmount = 0.0` avec valeurs par défaut
    - _Requirements: 6.1_

  - [ ] 16.2 Modifier `CreditTimelineService` pour persister les champs reliquat dans `credit_timeline`
    - Lire `reliquatGeneratedAmount` et `reliquatUsedAmount` depuis le `SpecialDailyStakeUnitDto`
    - Persister ces valeurs dans les colonnes `reliquat_generated_amount` et `reliquat_used_amount` de `credit_timeline`
    - _Requirements: 6.7_

- [ ] 17. Backend — Nouveaux DTOs de synchronisation reliquat
  - [ ] 17.1 Créer `ReliquatSyncDto` et `ReliquatSyncUnitDto`
    - Créer `ReliquatSyncDto` avec `@NotBlank String collector` et `@Valid List<ReliquatSyncUnitDto> reliquats`
    - Créer `ReliquatSyncUnitDto` (inner class ou classe séparée) avec `@NotNull Long clientId`, `@NotNull Double totalAmount`, `String lastRecoveryReference`, `LocalDate lastAccountedDate`
    - _Requirements: 6.2, 9.3_

- [ ] 18. Backend — Enrichissement de `DailyCommercialReport`
  - [ ] 18.1 Ajouter le champ `totalReliquatAmount` à l'entité `DailyCommercialReport`
    - Ajouter `private Double totalReliquatAmount = 0.0` à l'entité
    - Mettre à jour la logique de persistance du rapport journalier pour renseigner ce champ
    - _Requirements: 8.6_

- [ ] 19. Backend — Nouveaux endpoints dans `MobileController`
  - [ ] 19.1 Ajouter les endpoints `POST /api/v1/mobiles/reliquats` et `GET /api/v1/mobiles/reliquats/{commercialId}` dans `MobileController`
    - `POST /api/v1/mobiles/reliquats` : accepter `@RequestBody @Valid ReliquatSyncDto`, appeler `ClientReliquatService.upsert` pour chaque reliquat, retourner `{ synced: number, failed: number }`
    - Valider que `collector` est non vide et que la liste `reliquats` est valide avant traitement
    - Retourner 404 si un `clientId` est inconnu, loguer l'erreur
    - `GET /api/v1/mobiles/reliquats/{commercialId}` : retourner uniquement les reliquats avec `totalAmount > 0` pour le commercial demandé
    - _Requirements: 6.5, 6.6, 7.1, 7.2, 9.3, 9.4_

  - [ ]* 19.2 Écrire les tests unitaires JUnit 5 + Mockito pour `ClientReliquatService`
    - Cas nominal `upsert` : création d'un nouveau reliquat, mise à jour d'un reliquat existant
    - Cas d'erreur : `reliquatUsedAmount > totalAmount` → exception de validation
    - Vérifier l'invariant `totalAmount >= 0` après chaque opération
    - **Propriété 7 : totalAmount dans client_reliquats ne devient jamais négatif**
    - **Valide : Requirements 9.1, 9.2**

  - [ ]* 19.3 Écrire les tests unitaires JUnit 5 pour `MobileController` (endpoints reliquat)
    - Cas nominal `POST /api/v1/mobiles/reliquats` : vérifier la réponse `{ synced, failed }`
    - Cas d'erreur : `clientId` inconnu → 404
    - Cas d'erreur : `collector` vide → 400
    - _Requirements: 6.5, 6.6, 9.3, 9.4_

- [ ] 20. Checkpoint — Vérifier que tous les tests backend passent
  - S'assurer que tous les tests unitaires backend passent. Demander à l'utilisateur si des questions se posent.

- [ ] 21. Tests d'intégration — Flux complet mobile et synchronisation
  - [ ]* 21.1 Écrire les tests d'intégration Jest pour le flux complet mobile
    - Flux : saisie montant → `computeRecoveryPlan` → confirmation → vérification SQLite (`recoveries` + `client_reliquats`)
    - Accumulation sur N recouvrements → vérification `totalAmount` cumulé dans `client_reliquats`
    - Utilisation partielle du reliquat → vérification du solde résiduel après `consumeReliquat`
    - Rapport journalier avec et sans reliquat → vérification `totalAmountToDeposit`
    - **Propriété 8 : Unicité de la ligne reliquat par client (upsert)**
    - **Valide : Requirements 3.4**

  - [ ]* 21.2 Écrire les tests d'intégration pour la synchronisation backend
    - Vérifier que `credit_timeline` reçoit les bons champs `reliquat_generated_amount` et `reliquat_used_amount` après `POST /api/v1/mobiles/special-daily-stake`
    - Vérifier que `client_reliquat` est correctement upsert après `POST /api/v1/mobiles/reliquats`
    - Vérifier que `GET /api/v1/mobiles/reliquats/{commercialId}` retourne uniquement les reliquats avec `totalAmount > 0`
    - _Requirements: 6.5, 6.7, 7.2_

- [ ] 22. Checkpoint final — Vérifier que tous les tests passent
  - S'assurer que tous les tests unitaires, de propriétés et d'intégration (mobile et backend) passent. Demander à l'utilisateur si des questions se posent.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Chaque tâche référence les requirements spécifiques pour la traçabilité
- Les tests de propriétés (fast-check) valident les 9 invariants universels définis dans le design
- Les tests unitaires valident les exemples spécifiques et les cas limites
- Le mobile utilise TypeScript (Ionic/Angular, Jest, fast-check, SQLite via `@capacitor-community/sqlite`)
- Le backend utilise Java (Spring Boot, JPA/Hibernate, JUnit 5, Mockito, Flyway)
- L'ordre des tâches respecte les dépendances : migrations → interfaces → repository → service → UI → comptabilité → sync → backend
