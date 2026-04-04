# Document de Requirements — Rattrapage Crédit Vente

## Introduction

La fonctionnalité de **rattrapage** permet aux commerciaux (et aux gestionnaires/secrétaires agissant pour leur compte) de distribuer des articles restants dans un stock d'un mois antérieur à un client, sous forme de crédit étalé dans le temps. Elle comble un manque du système actuel qui bloque l'accès aux stocks des mois précédents pour les nouvelles distributions.

Le flow se distingue du `credit-add` existant par deux dimensions supplémentaires :
1. **Sélection d'un stock historique** — le commercial choisit un `CommercialMonthlyStock` d'un mois passé ayant encore des articles non distribués (`quantityRemaining > 0`).
2. **Paramètres de crédit étalé** — la date de début peut être dans le passé, la mise journalière est saisie manuellement, et la date de fin est calculée automatiquement.

La section "retour en magasin" est prévue dans la maquette en état désactivé (dashed) pour préparer la prochaine itération sans bloquer le développement actuel.

---

## Glossaire

- **Commercial** : utilisateur avec le profil `PROMOTER` qui gère un stock mensuel personnel.
- **Gestionnaire / Secrétaire** : utilisateur avec le profil `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN` ou `SECRETARY` pouvant agir au nom d'un commercial.
- **CommercialMonthlyStock** : entité représentant le stock mensuel d'un commercial pour un mois et une année donnés.
- **CommercialMonthlyStockItem** : ligne d'article dans un `CommercialMonthlyStock`, portant les champs `quantityTaken`, `quantitySold`, `quantityReturned`, `quantityRemaining`, `lastUnitPrice`, `weightedAverageUnitPrice`.
- **Stock résiduel** : `CommercialMonthlyStock` d'un mois antérieur au mois courant ayant au moins un `CommercialMonthlyStockItem` avec `quantityRemaining > 0`.
- **Rattrapage** : opération de distribution d'articles issus d'un stock résiduel vers un client, créant un `Credit` de type `CREDIT` avec statut `INPROGRESS`.
- **Crédit étalé** : crédit dont le remboursement est planifié sur une période calculée à partir d'une mise journalière.
- **Mise journalière** : montant en FCFA que le client s'engage à payer chaque jour.
- **Avance** : montant déjà perçu par le commercial avant la création du rattrapage.
- **Date de fin calculée** : `dateDébut + ceil((totalAmount - avance) / miseJournalière)` jours.
- **RattrapageCreditService** : service backend dédié à la création du rattrapage et à la récupération des stocks résiduels.
- **RattrapageCreditController** : controller backend exposant les endpoints `POST /api/v1/credits/rattrapage` et `GET /api/v1/commercial-stock/residual`.
- **RattrapageCreditAddComponent** : composant Angular frontend gérant le formulaire en 4 étapes du rattrapage.
- **RattrapageCreditService (frontend)** : service Angular appelant les endpoints backend du rattrapage.

---

## Requirements

### Requirement 1 : Accès et sélection du commercial et du client

**User Story :** En tant que gestionnaire ou secrétaire, je veux sélectionner un commercial et un client pour initier un rattrapage, afin de pouvoir distribuer des articles résiduels au nom du commercial concerné.

#### Acceptance Criteria

1. THE RattrapageCreditAddComponent SHALL afficher un dropdown de sélection du commercial pour les utilisateurs ayant le profil `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN` ou `SECRETARY`.
2. WHEN l'utilisateur a le profil `PROMOTER`, THE RattrapageCreditAddComponent SHALL pré-remplir le champ commercial avec le `username` de l'utilisateur connecté et désactiver la modification de ce champ.
3. WHEN un commercial est sélectionné, THE RattrapageCreditAddComponent SHALL charger la liste des clients associés à ce commercial via `ClientService.getClientsByCommercial(username)`.
4. THE RattrapageCreditAddComponent SHALL afficher un dropdown de sélection du client avec recherche par nom et prénom.
5. IF aucun commercial n'est sélectionné et que l'utilisateur n'est pas `PROMOTER`, THEN THE RattrapageCreditAddComponent SHALL désactiver la progression vers les étapes suivantes.

---

### Requirement 2 : Listage et sélection du stock résiduel antérieur

**User Story :** En tant que commercial ou gestionnaire, je veux voir la liste des stocks des mois passés ayant encore des articles non distribués, afin de choisir le mois à rattraper.

#### Acceptance Criteria

1. WHEN un commercial est identifié (sélectionné ou connecté), THE RattrapageCreditAddComponent SHALL appeler `GET /api/v1/commercial-stock/residual?collector={username}` pour charger les stocks résiduels.
2. THE RattrapageCreditController SHALL exposer l'endpoint `GET /api/v1/commercial-stock/residual` acceptant le paramètre `collector` (username du commercial).
3. THE RattrapageCreditService (backend) SHALL retourner uniquement les `CommercialMonthlyStock` dont le mois et l'année sont strictement antérieurs au mois et à l'année courants.
4. THE RattrapageCreditService (backend) SHALL retourner uniquement les `CommercialMonthlyStock` ayant au moins un `CommercialMonthlyStockItem` avec `quantityRemaining > 0`.
5. THE CommercialMonthlyStockRepository SHALL implémenter la requête JPQL `findResidualStocksByCollector(collector, currentMonth, currentYear)` filtrant sur `(year < currentYear) OR (year = currentYear AND month < currentMonth)` et `items.quantityRemaining > 0`.
6. THE RattrapageCreditAddComponent SHALL afficher les stocks résiduels sous forme de cartes cliquables indiquant le nom du mois, l'année, le nombre d'articles distincts résiduels, la quantité totale restante et la valeur totale estimée.
7. IF aucun stock résiduel n'est trouvé pour le commercial, THEN THE RattrapageCreditAddComponent SHALL afficher un message "Aucun stock résiduel trouvé pour ce commercial."
8. WHEN l'utilisateur clique sur une carte de stock, THE RattrapageCreditAddComponent SHALL sélectionner ce stock et passer à l'étape 3 (sélection des articles).

---

### Requirement 3 : Sélection des articles du stock résiduel

**User Story :** En tant que commercial ou gestionnaire, je veux sélectionner les articles à distribuer parmi ceux disponibles dans le stock résiduel choisi, afin de constituer la liste des articles du rattrapage.

#### Acceptance Criteria

1. THE RattrapageCreditAddComponent SHALL afficher uniquement les `CommercialMonthlyStockItem` du stock sélectionné ayant `quantityRemaining > 0`.
2. THE RattrapageCreditAddComponent SHALL afficher pour chaque article : son nom commercial, la quantité restante en stock, un champ de saisie de quantité à distribuer et le prix unitaire (`lastUnitPrice`).
3. WHEN l'utilisateur coche un article, THE RattrapageCreditAddComponent SHALL initialiser la quantité à distribuer à 1.
4. WHEN l'utilisateur saisit une quantité pour un article sélectionné, THE RattrapageCreditAddComponent SHALL valider que la quantité saisie est supérieure à 0 et inférieure ou égale à `quantityRemaining` de cet article.
5. IF la quantité saisie dépasse `quantityRemaining`, THEN THE RattrapageCreditAddComponent SHALL rejeter la valeur et conserver la dernière valeur valide.
6. THE RattrapageCreditAddComponent SHALL calculer et afficher en temps réel le sous-total par article (`quantité × lastUnitPrice`) et le total général de la sélection.
7. IF aucun article n'est sélectionné, THEN THE RattrapageCreditAddComponent SHALL empêcher la progression vers l'étape 4.

---

### Requirement 4 : Paramétrage du crédit étalé

**User Story :** En tant que commercial ou gestionnaire, je veux saisir les paramètres temporels du crédit (date de début, mise journalière, avance déjà reçue), afin que le système calcule automatiquement la date de fin et le nombre de jours de remboursement.

#### Acceptance Criteria

1. THE RattrapageCreditAddComponent SHALL afficher un champ "Date de début" de type date, acceptant des dates passées, présentes ou futures.
2. THE RattrapageCreditAddComponent SHALL afficher un champ "Mise journalière" en FCFA avec une valeur minimale de 200 FCFA.
3. THE RattrapageCreditAddComponent SHALL afficher un champ "Montant déjà payé (avance)" initialisé à 0, acceptant uniquement des valeurs positives ou nulles.
4. WHEN la date de début, la mise journalière et le montant total sont renseignés, THE RattrapageCreditAddComponent SHALL calculer automatiquement la date de fin selon la formule : `dateDébut + ceil((totalAmount - avance) / miseJournalière)` jours.
5. THE RattrapageCreditAddComponent SHALL afficher la date de fin calculée et le nombre de jours correspondant en lecture seule, avec le badge "Auto".
6. WHEN l'avance est modifiée, THE RattrapageCreditAddComponent SHALL recalculer immédiatement le montant restant dû et la date de fin.
7. THE RattrapageCreditAddComponent SHALL afficher un champ "Observation / Note" optionnel.
8. THE RattrapageCreditAddComponent SHALL afficher un récapitulatif de l'opération (commercial, stock d'origine, articles, période crédit, mise journalière, avance, montant total) avant la soumission.

---

### Requirement 5 : Validation et création du rattrapage (backend)

**User Story :** En tant que système, je veux créer un crédit de rattrapage et mettre à jour le stock source, afin que les quantités distribuées soient correctement imputées sur le mois d'origine.

#### Acceptance Criteria

1. THE RattrapageCreditController SHALL exposer l'endpoint `POST /api/v1/credits/rattrapage` acceptant un `RattrapageCreditDto` validé par Bean Validation.
2. THE RattrapageCreditService (backend) SHALL vérifier que le `CommercialMonthlyStock` identifié par `sourceStockId` existe et appartient au commercial indiqué dans le DTO.
3. THE RattrapageCreditService (backend) SHALL vérifier que le `CommercialMonthlyStock` source n'est pas le stock du mois courant.
4. WHEN la quantité demandée pour un article dépasse `quantityRemaining` du `CommercialMonthlyStockItem` correspondant, THEN THE RattrapageCreditService (backend) SHALL lever une `CustomValidationException` avec un message indiquant l'article concerné, la quantité disponible et la quantité demandée.
5. THE RattrapageCreditService (backend) SHALL créer un `Credit` avec `type = CREDIT`, `status = INPROGRESS`, `beginDate` issu du DTO, `dailyStake` issu du DTO, `advance` issu du DTO, et `expectedEndDate = beginDate + ceil((totalAmount - advance) / dailyStake)` jours.
6. THE RattrapageCreditService (backend) SHALL générer une référence unique préfixée `RAT-` suivie de 8 caractères alphanumériques en majuscules.
7. THE RattrapageCreditService (backend) SHALL mettre à jour chaque `CommercialMonthlyStockItem` du stock source en incrémentant `quantitySold` de la quantité distribuée et en appelant `updateRemaining()`.
8. THE RattrapageCreditService (backend) SHALL mettre à jour `totalSoldValue` de chaque `CommercialMonthlyStockItem` en ajoutant `quantité × unitPrice`.
9. THE RattrapageCreditService (backend) SHALL persister toutes les modifications dans une transaction atomique : si une étape échoue, aucune modification ne doit être sauvegardée.
10. WHEN le rattrapage est créé avec succès, THE RattrapageCreditController SHALL retourner une réponse HTTP 201 avec le `Credit` créé encapsulé dans `ResponseUtil.successResponse`.

---

### Requirement 6 : Soumission et navigation frontend

**User Story :** En tant que commercial ou gestionnaire, je veux soumettre le formulaire de rattrapage et être redirigé vers la liste des crédits, afin de confirmer que l'opération a bien été enregistrée.

#### Acceptance Criteria

1. WHEN l'utilisateur clique sur "Valider le rattrapage", THE RattrapageCreditAddComponent SHALL vérifier que tous les champs requis sont remplis et valides avant d'appeler `RattrapageCreditService.createRattrapage(payload)`.
2. IF le formulaire est invalide au moment de la soumission, THEN THE RattrapageCreditAddComponent SHALL marquer tous les champs comme touchés et afficher un message d'avertissement via `ToastrService`.
3. WHEN la création du rattrapage réussit, THE RattrapageCreditAddComponent SHALL afficher un message de succès via `ToastrService` et naviguer vers `/credit-list`.
4. IF le backend retourne une erreur, THEN THE RattrapageCreditAddComponent SHALL afficher le message d'erreur retourné par le backend via `ToastrService` sans naviguer.
5. THE RattrapageCreditAddComponent SHALL désactiver le bouton de soumission et afficher un spinner pendant le traitement de la requête.
6. THE RattrapageCreditAddComponent SHALL être accessible via la route `/credit/rattrapage` dans le module de routing Angular concerné.
7. THE RattrapageCreditAddComponent SHALL être accessible depuis la liste des crédits (`/credit-list`) via un bouton "Rattrapage stock antérieur" visible pour les profils `PROMOTER`, `GESTIONNAIRE` et `ADMIN`.

---

### Requirement 7 : Section retour en magasin (placeholder désactivé)

**User Story :** En tant que designer produit, je veux que la section "Retour en magasin" soit visible dans l'interface mais désactivée, afin de préparer visuellement la prochaine itération sans bloquer le développement actuel.

#### Acceptance Criteria

1. THE RattrapageCreditAddComponent SHALL afficher une section "Retour en magasin" avec un style visuel dashed/désactivé indiquant qu'elle n'est pas encore disponible.
2. WHILE la section retour en magasin est en état désactivé, THE RattrapageCreditAddComponent SHALL empêcher toute interaction utilisateur avec les contrôles de cette section.
3. THE RattrapageCreditAddComponent SHALL afficher un badge ou libellé "Prochainement" sur la section retour en magasin.

---

### Requirement 8 : Intégrité des données et règles métier

**User Story :** En tant que système, je veux garantir la cohérence des données entre le crédit créé et le stock source, afin d'éviter les sur-distributions et les incohérences comptables.

#### Acceptance Criteria

1. THE RattrapageCreditService (backend) SHALL s'assurer que la somme des `quantitySold` après mise à jour ne dépasse jamais `quantityTaken - quantityReturned` pour chaque `CommercialMonthlyStockItem`.
2. THE RattrapageCreditService (backend) SHALL recalculer `expectedEndDate` côté backend indépendamment de la valeur fournie par le frontend, en appliquant la formule `beginDate + ceil((totalAmount - advance) / dailyStake)`.
3. IF `dailyStake` est inférieur à 200 FCFA, THEN THE RattrapageCreditService (backend) SHALL rejeter la requête avec une `CustomValidationException`.
4. IF `advance` est supérieur ou égal à `totalAmount`, THEN THE RattrapageCreditService (backend) SHALL créer le crédit avec `totalAmountRemaining = 0`, `remainingDaysCount = 0` et `expectedEndDate = beginDate`.
5. THE RattrapageCreditDto SHALL valider via Bean Validation que `commercial`, `clientId`, `sourceStockId`, `beginDate`, `dailyStake` et `items` sont non nuls, et que `dailyStake >= 200` et `advance >= 0`.
