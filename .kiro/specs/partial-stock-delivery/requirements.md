# Document des Exigences : Livraison Partielle de Stock (partial-stock-delivery)

## Introduction

Cette fonctionnalité modifie le comportement de livraison des demandes de sortie stock (`StockRequest` et `StockTontineRequest`). Actuellement, une livraison échoue entièrement si un seul article manque de stock. Le nouveau comportement livre les articles disponibles immédiatement et crée automatiquement une nouvelle demande validée pour les articles en rupture, maximisant ainsi la livraison effective.

## Glossaire

- **StockRequest** : Demande de sortie de stock standard
- **StockTontineRequest** : Demande de sortie de stock tontine
- **Service** : Le service backend (`StockRequestService` ou `StockTontineRequestService`) responsable de la logique de livraison
- **Controller** : Le contrôleur REST exposant l'endpoint de livraison
- **Frontend** : Le composant Angular (`stock-request-list` ou `stock-tontine-request-list`) gérant l'interaction utilisateur
- **PartialDeliveryResponseDTO** : Objet de transfert de données retourné par l'endpoint de livraison
- **DeliveryType** : Énumération indiquant le type de livraison (`FULL` ou `PARTIAL`)
- **Collector** : L'agent collecteur associé à une demande de stock
- **StockMovement** : Enregistrement d'un mouvement de stock généré lors d'une livraison

---

## Exigences

### Exigence 1 : Vérification du stock et classification des articles

**User Story :** En tant que gestionnaire de stock, je veux que le système vérifie la disponibilité de chaque article avant de livrer, afin de maximiser la livraison effective sans bloquer sur les ruptures.

#### Critères d'acceptation

1. WHEN une livraison est demandée pour une demande au statut VALIDATED, THE Service SHALL vérifier la quantité de stock disponible pour chaque article de la demande
2. WHEN tous les articles d'une demande ont un stock suffisant, THE Service SHALL livrer la demande complètement et retourner `DeliveryType.FULL`
3. WHEN certains articles d'une demande ont un stock insuffisant, THE Service SHALL livrer les articles disponibles et retourner `DeliveryType.PARTIAL`
4. WHEN aucun article d'une demande n'a de stock suffisant, THE Service SHALL rejeter la livraison avec une exception métier contenant le message "Aucun article disponible pour la livraison"
5. WHEN un article a une quantité disponible inférieure à la quantité demandée, THE Service SHALL livrer la quantité disponible et créer un article en attente pour la quantité restante

---

### Exigence 2 : Création automatique de la demande pendante

**User Story :** En tant que gestionnaire de stock, je veux qu'une nouvelle demande validée soit automatiquement créée pour les articles manquants lors d'une livraison partielle, afin que les articles en rupture soient automatiquement reportés sans intervention manuelle.

#### Critères d'acceptation

1. WHEN une livraison partielle se produit, THE Service SHALL créer une nouvelle demande de stock contenant uniquement les articles en attente
2. WHEN une nouvelle demande pendante est créée, THE Service SHALL lui assigner le même `collector` que la demande originale
3. WHEN une nouvelle demande pendante est créée, THE Service SHALL automatiquement définir son statut à VALIDATED
4. WHEN une livraison partielle se produit, THE Service SHALL marquer la demande originale comme DELIVERED

---

### Exigence 3 : Mouvements de stock

**User Story :** En tant que gestionnaire de stock, je veux que les mouvements de stock ne soient enregistrés que pour les articles effectivement livrés, afin de garantir l'exactitude des données de stock.

#### Critères d'acceptation

1. WHEN une livraison partielle se produit, THE Service SHALL enregistrer des mouvements de stock uniquement pour les articles livrés
2. WHEN une livraison partielle se produit, THE Service SHALL ne pas enregistrer de mouvement de stock pour les articles en attente

---

### Exigence 4 : Intégrité transactionnelle et gestion des erreurs

**User Story :** En tant que développeur, je veux que l'ensemble de l'opération de livraison soit atomique, afin de garantir la cohérence des données en cas d'erreur.

#### Critères d'acceptation

1. WHEN une opération de livraison échoue lors de la création de la demande pendante, THE Service SHALL effectuer un rollback complet de toutes les modifications
2. IF une demande de stock n'est pas trouvée, THEN THE Controller SHALL retourner une réponse 404 Not Found
3. IF une demande de stock n'est pas au statut VALIDATED, THEN THE Controller SHALL retourner une réponse 400 avec un message métier explicite

---

### Exigence 5 : Interface utilisateur — Affichage du résultat de livraison

**User Story :** En tant qu'utilisateur, je veux voir un récapitulatif adapté au résultat de la livraison, afin de comprendre immédiatement ce qui a été livré et ce qui est en attente.

#### Critères d'acceptation

1. WHEN une livraison retourne `DeliveryType.FULL`, THE Frontend SHALL afficher une notification de succès simple
2. WHEN une livraison retourne `DeliveryType.PARTIAL`, THE Frontend SHALL afficher un récapitulatif contenant les articles livrés et les informations sur la nouvelle demande pendante
3. WHEN une livraison se termine (FULL ou PARTIAL), THE Frontend SHALL recharger la liste des demandes

---

### Exigence 6 : Structure du PartialDeliveryResponseDTO

**User Story :** En tant que développeur frontend, je veux un DTO de réponse structuré et cohérent, afin de pouvoir afficher les informations de livraison de manière fiable.

#### Critères d'acceptation

1. THE PartialDeliveryResponseDTO SHALL contenir les champs : `deliveryType`, `deliveredRequestId`, `deliveredRequestReference`, `deliveredItems`, `pendingItems`, `pendingRequestId` et `pendingRequestReference`
2. WHEN `deliveryType` est `FULL`, THE PartialDeliveryResponseDTO SHALL avoir `pendingItems` vide et `pendingRequestId` et `pendingRequestReference` à null
3. WHEN `deliveryType` est `PARTIAL`, THE PartialDeliveryResponseDTO SHALL avoir `pendingItems` non vide et `pendingRequestId` et `pendingRequestReference` non null

---

### Exigence 7 : Application aux deux modules de stock

**User Story :** En tant que gestionnaire de stock, je veux que la livraison partielle fonctionne de manière identique pour le stock standard et le stock tontine, afin d'avoir un comportement cohérent dans toute l'application.

#### Critères d'acceptation

1. THE Service SHALL appliquer la logique de livraison partielle à `StockRequest` et à `StockTontineRequest`
2. WHEN une livraison partielle est effectuée sur une `StockTontineRequest`, THE Service SHALL appeler `tontineStockService.processStockDelivery()` uniquement pour les articles livrés
3. THE Controller SHALL exposer l'endpoint `PUT /{id}/deliver` retournant `PartialDeliveryResponseDTO` pour les deux modules stock standard et stock tontine
