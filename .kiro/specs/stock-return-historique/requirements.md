# Document de Requirements — Retour en Stock Historique

## Introduction

La fonctionnalité de **retour en stock historique** permet aux commerciaux (et aux gestionnaires/secrétaires agissant pour leur compte) de réintégrer des articles dans un stock d'un mois antérieur. C'est l'opération symétrique du rattrapage crédit vente : au lieu de distribuer des articles d'un stock passé vers un client, on retourne des articles vers ce stock passé.

Cette fonctionnalité comble le placeholder "Retour en magasin" prévu dans la maquette du rattrapage crédit vente, qui était affiché en état désactivé (dashed) en attente de cette itération.

---

## Glossaire

- **Commercial** : utilisateur avec le profil `PROMOTER` qui gère un stock mensuel personnel.
- **Gestionnaire / Secrétaire** : utilisateur avec le profil `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN` ou `SECRETARY` pouvant agir au nom d'un commercial.
- **CommercialMonthlyStock** : entité représentant le stock mensuel d'un commercial pour un mois et une année donnés.
- **CommercialMonthlyStockItem** : ligne d'article dans un `CommercialMonthlyStock`, portant les champs `quantityTaken`, `quantitySold`, `quantityReturned`, `quantityRemaining`.
- **Stock historique** : `CommercialMonthlyStock` d'un mois antérieur au mois courant ayant au moins un `CommercialMonthlyStockItem` avec `quantityRemaining > 0`.
- **Retour en stock historique** : opération de réintégration d'articles dans un stock historique, incrémentant `quantityReturned` et recalculant `quantityRemaining`.
- **StockReturn** : entité backend traçant l'opération de retour, avec référence `RET-XXXXXXXX`.
- **StockReturnController** : controller backend exposant l'endpoint `POST /api/v1/stock-returns/historique`.
- **StockReturnService** : service backend dédié à la création du retour et à la mise à jour du stock cible.
- **StockReturnHistoriqueComponent** : composant Angular frontend gérant le formulaire en 3 étapes du retour.
- **StockReturnService (frontend)** : service Angular appelant les endpoints backend du retour.

---

## Requirements

### Requirement 1 : Accès et sélection du commercial

**User Story :** En tant que gestionnaire ou secrétaire, je veux sélectionner un commercial pour initier un retour en stock historique, afin de pouvoir réintégrer des articles au nom du commercial concerné.

#### Acceptance Criteria

1. THE StockReturnHistoriqueComponent SHALL afficher un dropdown de sélection du commercial pour les utilisateurs ayant le profil `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN` ou `SECRETARY`.
2. WHEN l'utilisateur a le profil `PROMOTER`, THE StockReturnHistoriqueComponent SHALL pré-remplir le champ commercial avec le `username` de l'utilisateur connecté et désactiver la modification de ce champ.
3. IF aucun commercial n'est sélectionné et que l'utilisateur n'est pas `PROMOTER`, THEN THE StockReturnHistoriqueComponent SHALL désactiver la progression vers les étapes suivantes.

---

### Requirement 2 : Listage et sélection du stock historique cible

**User Story :** En tant que commercial ou gestionnaire, je veux voir la liste des stocks des mois passés ayant encore des articles disponibles, afin de choisir le stock dans lequel retourner les articles.

#### Acceptance Criteria

1. WHEN un commercial est identifié (sélectionné ou connecté), THE StockReturnHistoriqueComponent SHALL appeler `GET /api/v1/commercial-stock/residual?collector={username}` pour charger les stocks historiques.
2. THE StockReturnHistoriqueComponent SHALL afficher les stocks historiques sous forme de cartes cliquables indiquant le nom du mois, l'année, le nombre d'articles distincts disponibles, la quantité totale restante et la valeur totale estimée.
3. THE StockReturnService (backend) SHALL retourner uniquement les `CommercialMonthlyStock` dont le mois et l'année sont strictement antérieurs au mois et à l'année courants.
4. THE StockReturnService (backend) SHALL retourner uniquement les `CommercialMonthlyStock` ayant au moins un `CommercialMonthlyStockItem` avec `quantityRemaining > 0`.
5. IF aucun stock historique n'est trouvé pour le commercial, THEN THE StockReturnHistoriqueComponent SHALL afficher un message "Aucun stock historique trouvé pour ce commercial."
6. WHEN l'utilisateur clique sur une carte de stock, THE StockReturnHistoriqueComponent SHALL sélectionner ce stock et passer à l'étape 2 (sélection des articles).

---

### Requirement 3 : Sélection des articles à retourner

**User Story :** En tant que commercial ou gestionnaire, je veux sélectionner les articles à retourner parmi ceux disponibles dans le stock historique choisi, afin de constituer la liste des articles du retour.

#### Acceptance Criteria

1. THE StockReturnHistoriqueComponent SHALL afficher uniquement les `CommercialMonthlyStockItem` du stock sélectionné ayant `quantityRemaining > 0`.
2. THE StockReturnHistoriqueComponent SHALL afficher pour chaque article : son nom commercial, la quantité restante en stock (`quantityRemaining`), un champ de saisie de quantité à retourner et le prix unitaire (`lastUnitPrice`).
3. WHEN l'utilisateur coche un article, THE StockReturnHistoriqueComponent SHALL initialiser la quantité à retourner à 1.
4. WHEN l'utilisateur saisit une quantité pour un article sélectionné, THE StockReturnHistoriqueComponent SHALL valider que la quantité saisie est supérieure à 0 et inférieure ou égale à `quantityRemaining` de cet article.
5. IF la quantité saisie dépasse `quantityRemaining`, THEN THE StockReturnHistoriqueComponent SHALL rejeter la valeur et conserver la dernière valeur valide.
6. THE StockReturnHistoriqueComponent SHALL calculer et afficher en temps réel le sous-total par article (`quantité × lastUnitPrice`) et la valeur totale du retour.
7. IF aucun article n'est sélectionné, THEN THE StockReturnHistoriqueComponent SHALL empêcher la progression vers l'étape 3.

---

### Requirement 4 : Confirmation et récapitulatif

**User Story :** En tant que commercial ou gestionnaire, je veux voir un récapitulatif complet avant de valider le retour, afin de vérifier que les informations sont correctes.

#### Acceptance Criteria

1. THE StockReturnHistoriqueComponent SHALL afficher un champ "Date du retour" de type date, initialisé à la date du jour, acceptant des dates passées ou présentes.
2. THE StockReturnHistoriqueComponent SHALL afficher un champ "Observation / Note" optionnel.
3. THE StockReturnHistoriqueComponent SHALL afficher un récapitulatif de l'opération : commercial, stock cible (mois/année), liste des articles avec quantités et prix, valeur totale du retour.

---

### Requirement 5 : Validation et création du retour (backend)

**User Story :** En tant que système, je veux créer un enregistrement de retour et mettre à jour le stock cible, afin que les quantités retournées soient correctement imputées sur le mois d'origine.

#### Acceptance Criteria

1. THE StockReturnController SHALL exposer l'endpoint `POST /api/v1/stock-returns/historique` acceptant un `StockReturnDto` validé par Bean Validation.
2. THE StockReturnService (backend) SHALL vérifier que le `CommercialMonthlyStock` identifié par `targetStockId` existe et appartient au commercial indiqué dans le DTO.
3. WHEN la quantité demandée pour un article dépasse `quantityRemaining` du `CommercialMonthlyStockItem` correspondant, THEN THE StockReturnService (backend) SHALL lever une `CustomValidationException` avec un message indiquant l'article concerné, la quantité disponible et la quantité demandée.
4. THE StockReturnService (backend) SHALL vérifier que le `CommercialMonthlyStock` cible n'est pas le stock du mois courant.
5. THE StockReturnService (backend) SHALL générer une référence unique préfixée `RET-` suivie de 8 caractères alphanumériques en majuscules.
6. THE StockReturnService (backend) SHALL persister toutes les modifications dans une transaction atomique : si une étape échoue, aucune modification ne doit être sauvegardée.
7. THE StockReturnService (backend) SHALL mettre à jour chaque `CommercialMonthlyStockItem` du stock cible en incrémentant `quantityReturned` de la quantité retournée et en appelant `updateRemaining()`.
8. WHEN le retour est créé avec succès, THE StockReturnController SHALL retourner une réponse HTTP 201 avec le `StockReturn` créé encapsulé dans `ResponseUtil.successResponse`.
9. THE StockReturnDto SHALL valider via Bean Validation que `commercial`, `targetStockId`, `returnDate` et `items` sont non nuls, et que chaque item a `quantity > 0`.

---

### Requirement 6 : Intégrité des données

**User Story :** En tant que système, je veux garantir la cohérence des données après chaque retour, afin d'éviter les incohérences comptables dans le stock.

#### Acceptance Criteria

1. THE StockReturnService (backend) SHALL s'assurer qu'après mise à jour, `quantityRemaining = quantityTaken - quantitySold - quantityReturned` pour chaque `CommercialMonthlyStockItem` modifié.
2. THE StockReturnService (backend) SHALL s'assurer que `quantityReturned` après mise à jour ne dépasse jamais `quantityTaken - quantitySold` pour chaque `CommercialMonthlyStockItem`.

---

### Requirement 7 : Soumission et navigation frontend

**User Story :** En tant que commercial ou gestionnaire, je veux soumettre le formulaire de retour et être redirigé vers le dashboard stock, afin de confirmer que l'opération a bien été enregistrée.

#### Acceptance Criteria

1. WHEN l'utilisateur clique sur "Valider le retour", THE StockReturnHistoriqueComponent SHALL vérifier que tous les champs requis sont remplis et valides avant d'appeler `StockReturnService.createHistoriqueReturn(payload)`.
2. IF le formulaire est invalide au moment de la soumission, THEN THE StockReturnHistoriqueComponent SHALL marquer tous les champs comme touchés et afficher un message d'avertissement via `ToastrService`.
3. WHEN la création du retour réussit, THE StockReturnHistoriqueComponent SHALL afficher un message de succès via `ToastrService` et naviguer vers `/stock/my-stock`.
4. IF le backend retourne une erreur, THEN THE StockReturnHistoriqueComponent SHALL afficher le message d'erreur retourné par le backend via `ToastrService` sans naviguer.
5. THE StockReturnHistoriqueComponent SHALL désactiver le bouton de soumission et afficher un spinner pendant le traitement de la requête.
6. THE StockReturnHistoriqueComponent SHALL être accessible via la route `/stock/return/historique` dans le module de routing Angular concerné.
7. THE StockReturnHistoriqueComponent SHALL être accessible depuis le dashboard stock (`/stock/my-stock`) via un bouton "Retour stock antérieur" visible pour les profils `PROMOTER`, `GESTIONNAIRE` et `ADMIN`.
