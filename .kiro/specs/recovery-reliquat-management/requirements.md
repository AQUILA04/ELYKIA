# Document de Requirements : Gestion des Reliquats de Recouvrement

## Introduction

Cette fonctionnalité introduit la gestion des **reliquats** dans le flux de recouvrement de crédit. Un reliquat est un excédent de paiement conservé par le commercial pour le compte d'un client lorsque le montant remis est supérieur à une mise mais insuffisant pour en couvrir deux. Les reliquats s'accumulent et peuvent être réutilisés lors des recouvrements suivants pour couvrir des mises supplémentaires. Ils sont inclus dans la comptabilité journalière avec une règle anti-double comptage, persistés localement en SQLite sur le mobile, et synchronisés vers le backend Spring Boot.

---

## Glossaire

- **Reliquat** : Excédent de paiement conservé par le commercial pour le compte d'un client, non encore utilisé pour couvrir une mise.
- **Mise** : Montant unitaire d'un remboursement de crédit (ex. : 350 FCFA).
- **Plan de recouvrement** : Résultat du calcul `computeRecoveryPlan()` décrivant le nombre de mises couvertes, le reliquat utilisé, le reliquat généré et le montant en espèces requis.
- **ReliquatService** : Service mobile responsable du calcul du plan de recouvrement et de la gestion du cycle de vie des reliquats.
- **ReliquatRepository** : Couche de persistance mobile pour la table SQLite `client_reliquats`.
- **RecoveryService** : Service mobile orchestrant la création d'un recouvrement et l'intégration du reliquat.
- **RecoveryPage** : Page mobile principale du flux de recouvrement.
- **ReliquatDisplayComponent** : Composant mobile affichant le reliquat courant, le plan calculé et les checkboxes de contrôle.
- **RapportJournalierService** : Service mobile calculant le rapport journalier du commercial, incluant le reliquat net.
- **SynchronizationService** : Service mobile envoyant les données au backend.
- **CreditDetailsPage** : Page mobile affichant le détail d'un crédit client.
- **MobileController** : Contrôleur backend exposant les endpoints de synchronisation mobile.
- **ClientReliquatService** : Service backend gérant la persistance et la mise à jour des reliquats clients.
- **CreditTimelineService** : Service backend traitant les mises de recouvrement et les persistant dans `credit_timeline`.
- **Anti-double comptage** : Règle garantissant qu'un reliquat déjà inclus dans un rapport journalier précédent n'est pas recompté le jour suivant.
- **lastAccountedDate** : Date de dernière comptabilisation d'un reliquat, utilisée pour l'anti-double comptage.
- **totalAmountToDeposit** : Montant total que le commercial doit déposer à la fin de la journée.

---

## Requirements

### Requirement 1 : Calcul du plan de recouvrement

**User Story :** En tant que commercial, je veux que le système calcule automatiquement le plan de recouvrement optimal en tenant compte du reliquat existant du client, afin de savoir combien de mises sont couvertes et quel reliquat sera généré ou consommé.

#### Acceptance Criteria

1. WHEN `computeRecoveryPlan` est appelé avec `useReliquat = true`, THE `ReliquatService` SHALL calculer `effectiveAmount = received + existingReliquat` pour déterminer le nombre de mises couvertes.
2. WHEN `computeRecoveryPlan` est appelé avec `useReliquat = false`, THE `ReliquatService` SHALL calculer `effectiveAmount = received` en ignorant le reliquat existant, et SHALL retourner `reliquatUsed = 0`.
3. THE `ReliquatService` SHALL calculer `misesCount = Math.floor(effectiveAmount / stake)` et `amountCovered = misesCount * stake`.
4. THE `ReliquatService` SHALL calculer `reliquatGenerated = effectiveAmount - amountCovered`.
5. THE `ReliquatService` SHALL toujours retourner `cashNeeded = received`, indépendamment de l'utilisation du reliquat.
6. THE `ReliquatService` SHALL calculer `reliquatUsed` comme le montant du reliquat existant effectivement consommé pour atteindre `amountCovered`, sans jamais dépasser `existingReliquat`.
7. IF `misesCount = 0` et `existingReliquat = 0`, THEN THE `RecoveryPage` SHALL désactiver le bouton de confirmation du recouvrement.
8. IF `misesCount = 0` et `received + existingReliquat >= stake`, THEN THE `ReliquatService` SHALL retourner un plan valide avec `misesCount >= 1`.

---

### Requirement 2 : Affichage et contrôle du reliquat dans l'écran de recouvrement

**User Story :** En tant que commercial, je veux voir le reliquat existant du client et contrôler son utilisation via des checkboxes, afin de décider si je combine le reliquat avec le paiement courant et si je conserve l'excédent généré.

#### Acceptance Criteria

1. WHEN la `RecoveryPage` est chargée pour un client, THE `ReliquatDisplayComponent` SHALL afficher le montant du reliquat existant du client (0 FCFA si aucun reliquat).
2. WHEN `clientReliquat.totalAmount > 0`, THE `ReliquatDisplayComponent` SHALL afficher la checkbox "Utiliser le reliquat" cochée par défaut.
3. WHEN `clientReliquat.totalAmount = 0`, THE `ReliquatDisplayComponent` SHALL masquer la checkbox "Utiliser le reliquat".
4. WHEN `recoveryPlan.reliquatGenerated > 0`, THE `ReliquatDisplayComponent` SHALL afficher la checkbox "Conserver le reliquat" cochée par défaut.
5. WHEN `recoveryPlan.reliquatGenerated = 0`, THE `ReliquatDisplayComponent` SHALL masquer la checkbox "Conserver le reliquat".
6. WHEN le commercial modifie le montant saisi, THE `ReliquatDisplayComponent` SHALL recalculer et afficher le plan de recouvrement mis à jour en temps réel.
7. WHEN le commercial décoche "Utiliser le reliquat", THE `ReliquatService` SHALL recalculer le plan avec `useReliquat = false` et THE `ReliquatDisplayComponent` SHALL mettre à jour l'affichage.
8. WHEN le commercial décoche "Conserver le reliquat", THE `RecoveryService` SHALL ne pas sauvegarder le reliquat généré lors de la confirmation.

---

### Requirement 3 : Confirmation et persistance du recouvrement avec reliquat

**User Story :** En tant que commercial, je veux que la confirmation d'un recouvrement persiste atomiquement le recouvrement et le reliquat associé, afin de garantir la cohérence des données locales.

#### Acceptance Criteria

1. WHEN le commercial confirme un recouvrement, THE `RecoveryService` SHALL sauvegarder le recouvrement avec les champs `reliquatGeneratedAmount` et `reliquatUsedAmount` dans la table `recoveries`.
2. WHEN `keepReliquat = true` et `reliquatGenerated > 0`, THE `RecoveryService` SHALL appeler `ReliquatService.addReliquat(clientId, reliquatGenerated, recoveryId)` pour accumuler le reliquat du client.
3. WHEN `reliquatUsed > 0`, THE `RecoveryService` SHALL appeler `ReliquatService.consumeReliquat(clientId, reliquatUsed)` pour déduire le montant consommé du reliquat existant.
4. THE `ReliquatRepository` SHALL maintenir au maximum une ligne par client dans la table `client_reliquats`, en utilisant une logique upsert.
5. THE `ReliquatService` SHALL garantir que `totalAmount` dans `client_reliquats` ne devient jamais négatif après un `consumeReliquat`.
6. IF la sauvegarde du reliquat en SQLite échoue, THEN THE `RecoveryService` SHALL annuler le recouvrement (atomicité transactionnelle) et THE `RecoveryPage` SHALL afficher un message d'erreur.
7. WHEN le recouvrement est confirmé avec succès, THE `RecoveryPage` SHALL afficher un toast récapitulatif indiquant le nombre de mises enregistrées, le reliquat utilisé et/ou conservé.

---

### Requirement 4 : Comptabilité journalière avec anti-double comptage

**User Story :** En tant que commercial, je veux que le rapport journalier inclue le reliquat net du jour sans double comptage, afin que le montant total à déposer soit exact.

#### Acceptance Criteria

1. THE `RapportJournalierService` SHALL calculer `reliquatNetDuJour = Σ(reliquats générés à la date J) - Σ(reliquats déjà comptabilisés avant la date J)`.
2. THE `RapportJournalierService` SHALL inclure `reliquatNetDuJour` dans le calcul de `totalAmountToDeposit` selon la formule : `totalAmountToDeposit = collectionsAmount + tontineCollectionsAmount + advancesAmount + reliquatNetDuJour`.
3. WHEN un reliquat a `lastAccountedDate = J-1`, THE `RapportJournalierService` SHALL exclure ce reliquat du calcul de `reliquatNetDuJour` pour la date J.
4. WHEN un reliquat a `lastAccountedDate = null` ou `lastAccountedDate = J`, THE `RapportJournalierService` SHALL inclure ce reliquat dans le calcul de `reliquatNetDuJour` pour la date J.
5. WHEN le rapport journalier est généré, THE `RapportJournalierService` SHALL mettre à jour `lastAccountedDate` à la date J pour tous les reliquats inclus dans le calcul.
6. THE `RapportJournalierService` SHALL garantir que `reliquatNetDuJour >= 0`.

---

### Requirement 5 : Affichage du reliquat dans la vue détail crédit

**User Story :** En tant que commercial, je veux voir le reliquat actuel d'un client dans la vue détail de son crédit, afin d'avoir une vision complète de sa situation financière.

#### Acceptance Criteria

1. WHEN la `CreditDetailsPage` est chargée pour un client, THE `CreditDetailsPage` SHALL appeler `ReliquatService.getReliquatForClient(clientId)` pour récupérer le reliquat du client.
2. WHEN le reliquat du client est supérieur à 0, THE `CreditDetailsPage` SHALL afficher le montant du reliquat avec son libellé.
3. WHEN le client n'a pas de reliquat, THE `CreditDetailsPage` SHALL afficher "0 FCFA" ou masquer la section reliquat.

---

### Requirement 6 : Synchronisation mobile vers backend

**User Story :** En tant que système, je veux synchroniser les reliquats et les recouvrements enrichis vers le backend, afin de maintenir la cohérence des données entre le mobile et le serveur.

#### Acceptance Criteria

1. THE `SynchronizationService` SHALL envoyer les recouvrements enrichis via `POST /api/v1/mobiles/special-daily-stake` avec le `SpecialDailyStakeUnitDto` incluant les champs `reliquatGeneratedAmount` et `reliquatUsedAmount`.
2. THE `SynchronizationService` SHALL envoyer les reliquats non synchronisés via `POST /api/v1/mobiles/reliquats` avec un `ReliquatSyncDto` regroupant tous les reliquats du commercial en un seul appel.
3. WHEN la synchronisation d'un reliquat réussit, THE `SynchronizationService` SHALL marquer le reliquat avec `isSync = true` et `syncDate` à la date courante.
4. IF la synchronisation d'un reliquat échoue, THEN THE `SynchronizationService` SHALL conserver `isSync = false` et SHALL retenter la synchronisation lors de la prochaine session de synchronisation.
5. THE `MobileController` SHALL persister ou mettre à jour les reliquats reçus dans la table `client_reliquat` via une logique upsert basée sur `clientId`.
6. IF le backend reçoit un reliquat pour un `clientId` inconnu, THEN THE `MobileController` SHALL retourner une erreur 404 et THE `SynchronizationService` SHALL marquer le reliquat comme `syncFailed`.
7. THE `CreditTimelineService` SHALL persister les valeurs `reliquatGeneratedAmount` et `reliquatUsedAmount` dans la table `credit_timeline` lors du traitement de chaque mise.

---

### Requirement 7 : Récupération des reliquats lors de l'initialisation mobile

**User Story :** En tant que commercial, je veux que les reliquats de mes clients soient chargés depuis le backend lors de l'initialisation de l'application, afin de disposer de données à jour même après réinstallation.

#### Acceptance Criteria

1. WHEN l'application mobile s'initialise, THE `SynchronizationService` SHALL appeler `GET /api/v1/mobiles/reliquats/{commercialId}` pour récupérer les reliquats actifs du commercial.
2. THE `MobileController` SHALL retourner uniquement les reliquats avec `totalAmount > 0` pour le commercial demandé.
3. WHEN les reliquats sont reçus du backend, THE `ReliquatRepository` SHALL les persister localement via upsert dans la table `client_reliquats`.

---

### Requirement 8 : Migrations de base de données

**User Story :** En tant que développeur, je veux que les migrations de base de données créent les structures nécessaires à la gestion des reliquats, afin que la fonctionnalité soit opérationnelle après déploiement.

#### Acceptance Criteria

1. THE migration SQLite v22 SHALL créer la table `client_reliquats` avec les colonnes : `id`, `clientId`, `commercialId`, `totalAmount`, `lastRecoveryId`, `createdAt`, `updatedAt`, `lastAccountedDate`, `isSync`, `syncDate`, et une contrainte de clé étrangère vers `clients(id)`.
2. THE migration SQLite v22 SHALL créer les index `idx_client_reliquats_clientId` et `idx_client_reliquats_commercialId` sur la table `client_reliquats`.
3. THE migration SQLite v22 SHALL ajouter les colonnes `reliquatGeneratedAmount` et `reliquatUsedAmount` à la table `recoveries` avec une valeur par défaut de 0.
4. THE migration Flyway V36 SHALL créer la table `client_reliquat` avec les colonnes : `id`, `client_id`, `commercial_username`, `total_amount`, `last_recovery_reference`, `last_accounted_date`, `created_date`, `last_modified_date`, et une contrainte de clé étrangère vers `client(id)`.
5. THE migration Flyway V36 SHALL ajouter les colonnes `reliquat_generated_amount` et `reliquat_used_amount` à la table `credit_timeline` avec une valeur par défaut de 0.
6. THE migration Flyway V36 SHALL ajouter la colonne `total_reliquat_amount` à la table `daily_commercial_report` avec une valeur par défaut de 0.

---

### Requirement 9 : Validation backend des reliquats

**User Story :** En tant que système backend, je veux valider les données de reliquat reçues du mobile, afin de garantir l'intégrité des données persistées côté serveur.

#### Acceptance Criteria

1. THE `ClientReliquatService` SHALL valider que `reliquatUsedAmount <= totalAmount` du reliquat existant du client avant d'appliquer toute mise à jour.
2. IF `reliquatUsedAmount > totalAmount`, THEN THE `ClientReliquatService` SHALL rejeter la mise à jour et retourner une erreur de validation.
3. THE `MobileController` SHALL valider que le champ `collector` du `ReliquatSyncDto` est non vide et que la liste `reliquats` est valide avant traitement.
4. THE `MobileController` SHALL retourner un objet `{ synced: number, failed: number }` indiquant le résultat de la synchronisation par lot.
