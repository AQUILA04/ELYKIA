# Documentation de l'API : Gestion des Commandes

## 1. Vue d'ensemble

Ce document décrit les points d'accès de l'API (backend) pour la gestion du module de Commandes. Ce module permet de créer des commandes pour des clients, de gérer leur cycle de vie (de la création à la vente), et de générer des rapports.

---

## 2. Format de la Réponse de l'API

Toutes les réponses de l'API sont enveloppées dans un objet JSON standard pour assurer la cohérence.

### Structure de la Réponse

```json
{
  "status": "success", // ou "error"
  "statusCode": 200,      // Code de statut HTTP
  "message": "Opération réussie", // Message décrivant le résultat
  "service": "optimize-elykia-core", // Nom du service
  "data": { ... }       // L'objet de données réel en cas de succès, ou null en cas d'erreur
}
```

- **En cas de succès :** Le champ `data` contiendra l'objet ou la liste d'objets demandé.
- **En cas d'erreur :** Le champ `data` sera `null` et le champ `message` contiendra une description de l'erreur.

---

## 3. Modèles de Données (JSON) et Énumérations

Voici la structure des objets de données principaux tels que retournés **à l'intérieur du champ `data`** de la réponse API.

### Order

L'entité principale de la commande.

```json
{
  "id": 1,
  "createdBy": "user",
  "createdDate": "2025-10-08T18:00:00",
  // ... autres champs d'audit ...
  "client": { /* ... objet Client ... */ },
  "orderDate": "2025-10-08T18:00:00",
  "totalAmount": 150000.0,
  "status": "PENDING",
  "items": [
    { /* ... objet OrderItem ... */ }
  ]
}
```

### OrderItem

Un article spécifique et sa quantité au sein d'une commande.

```json
{
  "id": 1,
  // ... champs d'audit ...
  "order": { /* ... objet Order ... */ },
  "article": { /* ... objet Articles ... */ },
  "quantity": 2,
  "unitPrice": 75000.0
}
```

### OrderStatusHistory

Un enregistrement d'audit pour chaque changement de statut d'une commande.

```json
{
  "id": 1,
  // ... champs d'audit ...
  "order": { /* ... objet Order ... */ },
  "oldStatus": "PENDING",
  "newStatus": "ACCEPTED",
  "changeTimestamp": "2025-10-08T18:30:00",
  "changedBy": "adminUser"
}
```

### OrderStatus (Enum)

Le statut d'une commande. Les valeurs possibles sont :
- `PENDING` (En attente)
- `ACCEPTED` (Acceptée)
- `DENIED` (Refusée)
- `CANCEL` (Annulée)
- `SOLD` (Vendu)

---

## 4. Points d'accès de l'API (Endpoints)

Tous les points d'accès sont préfixés par `/api/v1/orders` et requièrent une authentification par jeton (Bearer Token).

### 4.1 Créer une commande

Crée une nouvelle commande. Le statut sera initialisé à `PENDING`.

- **Method :** `POST`
- **URL :** `/api/v1/orders`
- **Request Body :**

```json
{
  "clientId": 123,
  "items": [
    { "articleId": 1, "quantity": 2 },
    { "articleId": 5, "quantity": 1 }
  ]
}
```

- **Réponse (Succès 201 CREATED) :**

```json
{
    "status": "success",
    "statusCode": 201,
    "message": "Opération réussie",
    "service": "optimize-elykia-core",
    "data": {
        // ... objet Order complet ...
    }
}
```

### 4.2 Lister les commandes

Récupère une liste paginée de commandes. Par défaut, ne retourne que les commandes avec le statut `PENDING`.

- **Method :** `GET`
- **URL :** `/api/v1/orders`
- **Paramètres de requête (Query Params) :**
  - `status` (optionnel) : Filtre les commandes par un statut spécifique (ex: `ACCEPTED`).
  - `page`, `size` : Pour la pagination.
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra un objet `Page` avec la liste des `Order`.

### 4.3 Modifier une commande en attente

Met à jour les articles et quantités d'une commande existante. **Ne fonctionne que si la commande a le statut `PENDING`.**

- **Method :** `PUT`
- **URL :** `/api/v1/orders/{id}`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra l'objet `Order` mis à jour.

### 4.4 Changer le statut d'une ou plusieurs commandes

Met à jour le statut pour une liste d'IDs de commandes.

- **Method :** `PATCH`
- **URL :** `/api/v1/orders/status`
- **Request Body :**

```json
{
  "orderIds": [1, 2, 5],
  "newStatus": "ACCEPTED"
}
```

- **Logique des statuts :**
  - `PENDING` -> `ACCEPTED`, `DENIED`, `CANCEL`
  - `ACCEPTED` -> `SOLD`
  - `DENIED`, `CANCEL` -> `PENDING`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra une liste des objets `Order` mis à jour.

### 4.5 Vendre une commande (Créer un Crédit)

Convertit une commande `ACCEPTED` en un `Credit` avec le statut `VALIDATED`.

- **Method :** `POST`
- **URL :** `/api/v1/orders/{id}/sell`
- **Réponse (Succès 201 CREATED) :** Le champ `data` contiendra le nouvel objet `Credit` créé.

### 4.6 Obtenir les détails d'une commande

- **Method :** `GET`
- **URL :** `/api/v1/orders/{id}`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra l'objet `Order` complet.

### 4.7 Supprimer une commande

- **Method :** `DELETE`
- **URL :** `/api/v1/orders/{id}`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra un message de confirmation.

---

## 5. Endpoints de Rapports et Agrégation

### 5.1 Résumé des articles commandés

- **Method :** `GET`
- **URL :** `/api/v1/orders/items/summary`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra une page d'objets `ArticleOrderSummaryDto`.

### 5.2 Rapport de réapprovisionnement en PDF

- **Method :** `GET`
- **URL :** `/api/v1/orders/reports/restock-needed`
- **Réponse (Succès 200 OK) :** Un fichier PDF (`application/pdf`).
