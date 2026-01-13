# 📄 Documentation Technique : Refonte Gestion du Stock Tontine Commercial

## 1. Contexte et Objectifs

Initialement, la gestion du stock de tontine pour les commerciaux était intégrée de manière simplifiée via l'entité `Credit` (type `TONTINE`). Cette approche mélangeait la notion de "dette/vente" avec celle d'approvisionnement en stock, ce qui manquait de granularité et de cohérence avec la gestion des stocks commerciaux pour les ventes à crédit (`StockRequest`, `StockReturn`, `CommercialMonthlyStock`).

L'objectif de cette refonte est d'aligner la gestion du stock de tontine sur le modèle robuste et détaillé des stocks commerciaux, en introduisant des entités dédiées pour les demandes de sortie, les retours, et un suivi annuel consolidé, tout en assurant une intégration transparente avec le système de rapports journaliers.

**Objectifs Spécifiques :**
*   **Séparer les flux** : Distinguer clairement l'approvisionnement (demande de sortie) de la distribution (livraison au client final) et des retours.
*   **Traçabilité** : Améliorer le suivi des mouvements de stock de tontine chez le commercial.
*   **Cohérence** : Harmoniser la logique de gestion des stocks entre les ventes à crédit et la tontine.
*   **Reporting** : Assurer que tous les mouvements de stock de tontine sont correctement reflétés dans les rapports journaliers.
*   **Expérience Utilisateur** : Fournir une interface utilisateur cohérente et fonctionnelle pour la gestion du stock de tontine.

## 2. Analyse de l'Existant (Avant Refonte)

*   **Backend** :
    *   `Credit.java` : Utilisé pour enregistrer le stock de tontine (type `TONTINE`, `clientType=PROMOTER`).
    *   `TontineStock.java` : Entité existante pour suivre le stock de t'ontine par commercial, article et année. Contenait `totalQuantity`, `availableQuantity`, `distributedQuantity`.
    *   `TontineController` : Exposait un endpoint `/api/v1/tontines/stock` pour récupérer le stock global.
*   **Frontend** :
    *   Pas de module dédié pour la gestion des demandes/retours de stock de tontine.
    *   Le stock de tontine était géré implicitement via les opérations de tontine (adhésion, collecte, livraison).

## 3. Nouvelle Architecture et Implémentation

La refonte a introduit de nouvelles entités et logiques pour gérer le cycle de vie complet du stock de tontine, en s'inspirant directement du modèle `StockRequest`/`StockReturn`/`CommercialMonthlyStock`.

### 3.1 Implémentation Backend (Java / Spring Boot)

#### A. Nouvelles Entités (Modèle de Données)

1.  **`StockTontineRequest.java`**
    *   Représente une demande d'approvisionnement en stock de tontine par un commercial.
    *   **Champs clés** : `reference` (générée), `collector`, `requestDate`, `validationDate`, `deliveryDate`, `status` (CREATED, VALIDATED, DELIVERED), `totalSalePrice`, `totalPurchasePrice`.
    *   **Relation** : `OneToMany` avec `StockTontineRequestItem`.

2.  **`StockTontineRequestItem.java`**
    *   Détail des articles inclus dans une `StockTontineRequest`.
    *   **Champs clés** : `article`, `quantity`, `unitPrice` (prix figé à la création), `purchasePrice` (prix figé à la création), `itemName`.
    *   **Relation** : `ManyToOne` avec `StockTontineRequest`.

3.  **`StockTontineReturn.java`**
    *   Représente un retour de stock de tontine du commercial vers le magasin.
    *   **Champs clés** : `collector`, `returnDate`, `status` (CREATED, RECEIVED).
    *   **Relation** : `OneToMany` avec `StockTontineReturnItem`.

4.  **`StockTontineReturnItem.java`**
    *   Détail des articles inclus dans un `StockTontineReturn`.
    *   **Champs clés** : `article`, `quantity`.
    *   **Relation** : `ManyToOne` avec `StockTontineReturn`.

#### B. Mise à jour des Entités existantes

1.  **`TontineStock.java`**
    *   **Ajout** : `quantityReturned` (Integer, default 0) pour suivre les quantités retournées.
    *   **Ajout** : `weightedAverageUnitPrice` (Double, default 0.0) pour la valorisation du stock restant (Prix Moyen Pondéré).
    *   **Mise à jour** : Méthodes `addQuantity`, `removeQuantity` et `returnQuantity` adaptées.
    *   **Note** : Le champ `creditId` est maintenu pour compatibilité mais deviendra obsolète à terme.

2.  **`DailyCommercialReport.java`**
    *   **Ajout** : `totalTontineStockRequestAmount` (Double, default 0.0) pour suivre la valeur totale des sorties de stock tontine.

3.  **`OperationType.java` (Enum)**
    *   **Ajout** : `STOCK_TONTINE_REQUEST` et `STOCK_TONTINE_RETURN` pour une meilleure granularité des logs d'opérations.

#### C. Nouveaux Repositories

1.  **`StockTontineRequestRepository.java`**
    *   Interface Spring Data JPA pour `StockTontineRequest`.
    *   **Méthodes ajoutées** : `findByCollectorOrderByIdDesc`, `findByStatusInOrderByIdDesc`, `findMaxId` (pour la génération de référence).

2.  **`StockTontineReturnRepository.java`**
    *   Interface Spring Data JPA pour `StockTontineReturn`.
    *   **Méthodes ajoutées** : `findByCollector` (paginé), `findByStatusIn` (paginé).

#### D. Nouveaux Services

1.  **`StockTontineRequestService.java`**
    *   Gère le cycle de vie des demandes de stock tontine (Création, Validation, Livraison).
    *   **`create(StockTontineRequest request)`** : Génère une référence unique (ex: `T#COL34567890`), fige les prix (`unitPrice`, `purchasePrice`) des articles, définit le statut `CREATED`.
    *   **`validate(Long id)`** : Passe le statut de `CREATED` à `VALIDATED`.
    *   **`deliver(Long id)`** :
        *   Vérifie la disponibilité du stock magasin pour les articles demandés.
        *   Enregistre un mouvement de stock (`MovementType.RELEASE`) via `StockMovementService`.
        *   Met à jour le stock magasin (`ArticlesService`).
        *   Appelle `tontineStockService.processStockDelivery` pour créditer le stock tontine du commercial.
        *   Publie un `StockTontineRequestDeliveredEvent`.
    *   **`getAll(String collector, Pageable pageable)`** : Retourne une page de demandes, avec une logique de filtrage par rôle (Promoter, Magasinier, Gestionnaire) similaire à `StockRequestService`.

2.  **`StockTontineReturnService.java`**
    *   Gère le cycle de vie des retours de stock tontine.
    *   **`save(StockTontineReturn entity)`** :
        *   Définit la date de retour et le `collector`.
        *   **Logique d'auto-validation** : Si l'utilisateur est un `STOREKEEPER` ou `ADMIN`, le statut passe directement à `RECEIVED` et la logique de validation est appliquée immédiatement. Sinon, le statut est `CREATED`.
    *   **`validate(Long id)`** : Passe le statut de `CREATED` à `RECEIVED` et applique la logique de validation.
    *   **`processValidationLogic(StockTontineReturn returnRequest)`** :
        *   Appelle `tontineStockService.processStockReturn` pour décrémenter le stock tontine du commercial.
        *   Publie un `StockTontineReturnedEvent`.
    *   **`getAll(String collector, Pageable pageable)`** : Retourne une page de retours, avec filtrage par rôle.

#### E. Mise à jour des Services existants

1.  **`TontineStockService.java`**
    *   **`processStockDelivery(StockTontineRequest request)`** : Met à jour le `TontineStock` du commercial (incrémente `totalQuantity`, `availableQuantity`) et recalcule le `weightedAverageUnitPrice`.
    *   **`processStockReturn(StockTontineReturn returnRequest)`** : Met à jour le `TontineStock` du commercial (incrémente `quantityReturned`, décrémente `availableQuantity`).
    *   **`getStock(String commercial)`** : Récupère le stock de tontine pour un commercial spécifique pour l'année en cours.
    *   **`getAll(String collector, Pageable pageable, Boolean historic)`** : Nouvelle méthode paginée pour récupérer le stock de tontine, filtrable par commercial et par mode historique (année en cours vs années précédentes), avec une logique de rôle.

#### F. Nouveaux Événements

1.  **`StockTontineRequestDeliveredEvent.java`** : Émis lors de la livraison d'une demande de stock tontine.
2.  **`StockTontineReturnedEvent.java`** : Émis lors de la validation d'un retour de stock tontine.

#### G. Mise à jour des Listeners

1.  **`DailyReportEventListener.java`**
    *   Écoute `StockTontineRequestDeliveredEvent` : Met à jour `DailyCommercialReport.totalTontineStockRequestAmount` et loggue `STOCK_TONTINE_REQUEST`.
    *   Écoute `StockTontineReturnedEvent` : Décrémente `DailyCommercialReport.totalTontineStockRequestAmount` et loggue `STOCK_TONTINE_RETURN`.

#### H. Nouveaux Controllers

1.  **`StockTontineRequestController.java`**
    *   Endpoints REST pour la création, validation, livraison et consultation des demandes de stock tontine.
    *   `POST /api/v1/stock-tontine-request/create` : Créer une demande.
    *   `PUT /api/v1/stock-tontine-request/{id}/validate` : Valider une demande.
    *   `PUT /api/v1/stock-tontine-request/{id}/deliver` : Livrer une demande.
    *   `GET /api/v1/stock-tontine-request?collector=...&page=...&size=...` : Récupérer toutes les demandes (paginé, filtrable par commercial).
    *   `GET /api/v1/stock-tontine-request/collector/{collector}` : Récupérer les demandes d'un commercial spécifique.

2.  **`StockTontineReturnController.java`**
    *   Endpoints REST pour la création et validation des retours de stock tontine.
    *   `POST /api/v1/stock-tontine-return/create` : Créer un retour.
    *   `PUT /api/v1/stock-tontine-return/{id}/validate` : Valider un retour.
    *   `GET /api/v1/stock-tontine-return?collector=...&page=...&size=...` : Récupérer tous les retours (paginé).
    *   `GET /api/v1/stock-tontine-return/collector/{collector}` : Récupérer les retours d'un commercial spécifique.

#### I. Mise à jour des Controllers existants

1.  **`TontineController.java`**
    *   L'endpoint `GET /api/v1/tontines/stock` a été modifié pour supporter la pagination (`Pageable`), le filtrage par `commercial` et le mode `historic` (année en cours vs historique). Il utilise désormais `tontineStockService.getAll`.

#### J. Migration Flyway (`V17__create_stock_tontine_management.sql`)

*   Création des tables `stock_tontine_request` et `stock_tontine_request_item`.
*   Création des tables `stock_tontine_return` et `stock_tontine_return_item`.
*   Ajout des colonnes `quantity_returned` et `weighted_average_unit_price` à la table `tontine_stock`.
*   Ajout de la colonne `total_tontine_stock_request_amount` à la table `daily_commercial_report`.
*   Mise à jour des contraintes `CHECK` sur la colonne `type` des tables `daily_operation_log` et `credit` pour inclure les nouveaux types `STOCK_TONTINE_REQUEST` et `STOCK_TONTINE_RETURN`.

### 3.2 Implémentation Frontend (Angular)

#### A. Nouveau Module

1.  **`StockTontineModule`** (`frontend/src/app/stock-tontine/stock-tontine.module.ts`)
    *   Module dédié pour regrouper toutes les fonctionnalités liées au stock de tontine.
    *   Inclut `StockTontineRoutingModule` et les composants déclarés.

2.  **`StockTontineRoutingModule`** (`frontend/src/app/stock-tontine/stock-tontine-routing.module.ts`)
    *   Définit les routes pour les différentes pages du module (liste des demandes, création de demande, liste des retours, création de retour, dashboard).

#### B. Nouveaux Modèles (TypeScript)

1.  **`stock-tontine-request.model.ts`** : Interfaces `StockTontineRequest`, `StockTontineRequestItem` et Enum `StockRequestStatus`.
2.  **`stock-tontine-return.model.ts`** : Interfaces `StockTontineReturn`, `StockTontineReturnItem` et Enum `StockReturnStatus`.
3.  **`tontine-stock.model.ts`** : Interface `TontineStock` (reflet de l'entité Java).

#### C. Nouveaux Services

1.  **`StockTontineRequestService.ts`**
    *   Service Angular pour interagir avec `StockTontineRequestController`.
    *   Méthodes : `create`, `validate`, `deliver`, `getAll` (avec pagination et filtre `collector`).

2.  **`StockTontineReturnService.ts`**
    *   Service Angular pour interagir avec `StockTontineReturnController`.
    *   Méthodes : `create`, `validate`, `getAllReturns`.

3.  **`TontineStockService.ts`**
    *   Service Angular pour interagir avec `TontineController` (endpoint `/stock`).
    *   Méthodes : `getMyStock` (pour l'utilisateur courant), `getStockByCommercial` (pour un commercial spécifique), `getAll` (avec pagination, filtre `commercial` et `historic`).

#### D. Nouveaux Composants (Pages)

1.  **`StockTontineRequestListComponent`**
    *   Affiche la liste paginée des demandes de stock tontine.
    *   **Logique de rôle** : Affiche les boutons "Valider" (pour les managers) et "Livrer" (pour les magasiniers) de manière conditionnelle.
    *   Utilise `StockTontineRequestService.getAll`.
    *   Style et template alignés sur `StockRequestListComponent`.

2.  **`StockTontineRequestCreateComponent`**
    *   Formulaire de création d'une demande de stock tontine.
    *   Permet de sélectionner des articles et des quantités.
    *   Calcule le prix unitaire et le prix d'achat (figés).
    *   Utilise `ItemService` pour la liste des articles disponibles.
    *   Style et template alignés sur `StockRequestCreateComponent`.

3.  **`StockTontineReturnListComponent`**
    *   Affiche la liste paginée des retours de stock tontine.
    *   Utilise `StockTontineReturnService.getAllReturns`.
    *   Style et template alignés sur `StockReturnListComponent`.

4.  **`StockTontineReturnCreateComponent`**
    *   Formulaire de création d'un retour de stock tontine.
    *   **Logique de rôle** : Si l'utilisateur est un magasinier, un sélecteur de commercial est affiché pour choisir le commercial dont le stock est retourné.
    *   Charge le stock disponible du commercial sélectionné (`TontineStockService.getStockByCommercial`).
    *   Validation de la quantité retournée par rapport au stock disponible.
    *   Style et template alignés sur `StockReturnCreateComponent`.

5.  **`MyTontineStockDashboardComponent`**
    *   Tableau de bord affichant le stock de tontine pour un commercial.
    *   **Logique de rôle** : Si l'utilisateur est un magasinier, un sélecteur de commercial est affiché.
    *   **Mode Historique** : Bouton pour basculer entre l'année en cours et l'historique.
    *   **Groupement** : Les données `TontineStock` (lignes d'articles) sont groupées par année pour un affichage en accordéon, similaire à `CommercialMonthlyStock`.
    *   **Statistiques** : Affiche des cartes récapitulatives (Valeur Stock Restant, Vendu, Dû).
    *   **Pagination** : Gère la pagination des groupes de stock.
    *   Style et template alignés sur `MyStockDashboardComponent`.

#### E. Mise à jour du Menu de Navigation

1.  **`sidebar.component.html` et `sidebar.component.ts`**
    *   Ajout d'un nouveau menu déroulant "Stock Tontine" après "Stock Commercial".
    *   Ce menu contient des liens vers "Demandes Sortie", "Stock" (Dashboard), et "Retours".
    *   La logique d'ouverture/fermeture du menu et de mise en surbrillance de la route active a été mise à jour.
    *   Les permissions (`ROLE_TONTINE`, `ROLE_STOREKEEPER`) sont utilisées pour contrôler la visibilité du menu.

## 4. Logique Métier Clé

*   **Génération de Référence** : Les demandes de stock tontine ont une référence unique générée automatiquement (`T#COLXXXIDTIMESTAMP`).
*   **Prix Figés** : Les prix unitaires et d'achat des articles sont figés au moment de la création de la demande pour assurer la cohérence comptable.
*   **Vérification Stock Magasin** : Avant toute livraison de stock tontine, le système vérifie la disponibilité des articles dans le stock magasin.
*   **Mouvements de Stock** : Chaque livraison de stock tontine déclenche un mouvement de `RELEASE` (sortie) du stock magasin.
*   **Mise à jour du PMP** : Le `weightedAverageUnitPrice` du `TontineStock` est recalculé à chaque nouvelle entrée pour refléter la valeur moyenne pondérée du stock.
*   **Auto-validation des Retours** : Les retours enregistrés par un magasinier sont automatiquement validés (`RECEIVED`), tandis que ceux initiés par un commercial nécessitent une validation manuelle.
*   **Filtrage par Rôle** : Les listes de demandes et les dashboards de stock s'adaptent au rôle de l'utilisateur (commercial ne voit que son stock, magasinier peut voir le stock de tous les commerciaux).

## 5. Conclusion

Cette refonte a permis de moderniser et d'harmoniser la gestion du stock de tontine, en la rendant plus traçable, cohérente et intégrée aux autres modules de gestion des stocks. Elle offre une meilleure visibilité sur les mouvements de stock et facilite le travail des commerciaux et des magasiniers.
