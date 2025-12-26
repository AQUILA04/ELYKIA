# Guide d'Intégration Mobile pour la Gestion de Tontine (Vérifié)

Ce document décrit les points d'API et les structures de données, vérifiés depuis le code source, pour intégrer la gestion de tontine dans l'application mobile.

## Logique de Données Mobile (Offline-First)

- **Clé Primaire Locale** : Pour les nouveaux enregistrements créés sur le mobile (membres, collectes), un **UUID (chaîne de caractères)** doit être généré et utilisé comme clé primaire temporaire pour le suivi local.
- **Clé Primaire Serveur** : Lors de la synchronisation, le serveur renverra son propre ID numérique. L'application mobile devra faire la correspondance entre son UUID local et l'ID du serveur pour marquer l'enregistrement comme "synchronisé".

---

## Phase 1 : Initialisation

L'application doit récupérer les données de la tontine active pour préparer l'environnement de travail de l'utilisateur.

### 1.1 Récupérer la Session de Tontine Active

L'application doit d'abord récupérer la session de tontine en cours.

- **Méthode**: `GET`
- **Endpoint**: `/api/v1/tontines/sessions/current`
- **Contrôleur**: `TontineController.java`
- **Description**: Récupère les détails de la session de tontine actuellement active.

#### Exemple de Réponse JSON (`200 OK`)

La structure est basée sur `TontineSessionDto.java` et encapsulée dans l'objet `Response`.

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "id": 1,
    "year": 2025,
    "startDate": "2025-01-15",
    "endDate": "2025-12-15",
    "status": "ACTIVE",
    "memberCount": 150,
    "totalCollected": 4530000.0
  }
}
```

### 1.2 Récupérer les Membres de la Session

Une fois l'ID de la session active obtenu, l'application peut charger la liste des membres.

- **Méthode**: `GET`
- **Endpoint**: `/api/v1/tontines/sessions/{sessionId}/members`
- **Contrôleur**: `TontineSessionController.java`
- **Description**: Récupère une page de membres pour une session de tontine donnée.

#### Exemple de Réponse JSON (`200 OK`)

La structure de pagination est basée sur l'exemple `getMembers.json` fourni.

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "content": [
      {
        "id": 1,
        "client": {
          "id": 15,
          "firstname": "MANUELA",
          "lastname": "JOSEPHA",
          "phone": "92005667",
          "code": "C0015",
          "fullName": "MANUELA JOSEPHA",
          "accountId": 15
        },
        "totalContribution": 2000.0,
        "deliveryStatus": "DELIVERED",
        "registrationDate": "2025-11-22T20:58:56.539702",
        "delivery": {
          "id": 2,
          "deliveryDate": "2025-11-23T18:04:44.40003",
          "totalAmount": 1950.0,
          "remainingBalance": 50.0,
          "commercialUsername": "ges003",
          "items": [
            {
              "id": 2,
              "articleName": "HUILE: Aromate Aromate 1L 1L",
              "quantity": 1,
              "totalPrice": 1100.0
            }
          ]
        }
      }
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 2,
      "totalPages": 1
    }
  }
}
```

### 1.3 Récupérer l'historique des Collectes d'un Membre

L'application peut récupérer l'historique des collectes pour un membre de tontine spécifique.

- **Méthode**: `GET`
- **Endpoint**: `/api/v1/tontines/members/{memberId}/collections`
- **Contrôleur**: `TontineController.java`
- **Description**: Récupère une page de l'historique des collectes pour un membre donné, triées par date de collecte.

#### Exemple de Requête

```
GET /api/v1/tontines/members/101/collections?page=0&size=10
```

#### Exemple de Réponse JSON (`200 OK`)

La structure est basée sur l'entité `TontineCollection.java` et encapsulée dans l'objet `Response`.

```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "content": [
      {
        "id": 501,
        "tontineMember": {
          "id": 101
        },
        "amount": 5000.0,
        "collectionDate": "2025-11-22T10:00:00",
        "commercialUsername": "user123"
      },
      {
        "id": 502,
        "tontineMember": {
          "id": 101
        },
        "amount": 2500.0,
        "collectionDate": "2025-11-15T10:00:00",
        "commercialUsername": "user123"
      }
    ],
    "page": {
      "size": 10,
      "number": 0,
      "totalElements": 2,
      "totalPages": 1
    }
  }
}
```

---

## Phase 2 : Synchronisation (Mobile vers Serveur)

### 2.1 Ajouter un Nouveau Membre à la Tontine

- **Méthode**: `POST`
- **Endpoint**: `/api/v1/tontines/members`
- **Contrôleur**: `TontineController.java`
- **Description**: Inscrit un nouveau client à la tontine active.

#### Exemple de Requête JSON

Basé sur `TontineMemberDto.java`.

```json
{
  "clientId": 351
}
```

#### Exemple de Réponse JSON (`201 Created`)

Retourne le membre nouvellement créé, encapsulé dans l'objet `Response`.

```json
{
  "status": "CREATED",
  "statusCode": 201,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "id": 102,
    "createdDate": "2025-11-24T14:00:00",
    "lastModifiedDate": "2025-11-24T14:00:00",
    "createdBy": "mobile_user",
    "lastModifiedBy": "mobile_user",
    "tontineSession": {
        "id": 1,
        "year": 2025,
        "status": "ACTIVE"
    },
    "client": { "id": 351, "firstName": "Nouveau", "lastName": "Membre", "code": "C00351" },
    "totalContribution": 0.0,
    "deliveryStatus": "SESSION_INPROGRESS",
    "registrationDate": "2025-11-24T14:00:00",
    "delivery": null
  }
}
```

### 2.2 Enregistrer une Collecte

- **Méthode**: `POST`
- **Endpoint**: `/api/v1/tontines/collections`
- **Contrôleur**: `TontineController.java`
- **Description**: Enregistre une collecte pour un membre.

#### Exemple de Requête JSON

Basé sur `TontineCollectionDto.java`.

```json
{
  "memberId": 101,
  "amount": 5000.0
}
```

#### Exemple de Réponse JSON (`201 Created`)

Retourne la transaction de collecte, encapsulée dans l'objet `Response`.

```json
{
  "status": "CREATED",
  "statusCode": 201,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "id": 512,
    "createdDate": "2025-11-24T14:30:00",
    "lastModifiedDate": "2025-11-24T14:30:00",
    "createdBy": "mobile_user",
    "lastModifiedBy": "mobile_user",
    "tontineMember": {
        "id": 101,
        "client": {
            "id": 205,
            "firstName": "Jean",
            "lastName": "Dupont"
        }
    },
    "amount": 5000.0,
    "collectionDate": "2025-11-24T14:30:00"
  }
}
```

### 2.3 Créer une Livraison (Demande de remise)

- **Méthode**: `POST`
- **Endpoint**: `/api/v1/tontines/deliveries`
- **Contrôleur**: `TontineDeliveryController.java`
- **Description**: Crée une demande de livraison (remise de tontine) pour un membre, avec une liste d'articles souhaités.

#### Exemple de Requête JSON

Basé sur `CreateDeliveryDto.java` et `DeliveryItemDto.java`.

```json
{
  "tontineMemberId": 101,
  "items": [
    {
      "articleId": 78,
      "quantity": 1
    },
    {
      "articleId": 92,
      "quantity": 3
    }
  ]
}
```

#### Exemple de Réponse JSON (`201 Created`)

Retourne la livraison nouvellement créée avec le statut `PENDING_VALIDATION`, encapsulée dans l'objet `Response`.

```json
{
  "status": "CREATED",
  "statusCode": 201,
  "message": "Livraison créée avec succès",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "id": 45,
    "createdDate": "2025-11-24T15:00:00",
    "lastModifiedDate": "2025-11-24T15:00:00",
    "createdBy": "mobile_user",
    "lastModifiedBy": "mobile_user",
    "tontineMember": {
        "id": 101,
        "client": {
            "id": 205,
            "firstName": "Jean",
            "lastName": "Dupont"
        }
    },
    "status": "PENDING_VALIDATION",
    "totalAmount": 275000.0,
    "requestDate": "2025-11-24T15:00:00",
    "deliveryDate": null,
    "items": [
      { "id": 1, "articleId": 78, "quantity": 1, "unitPrice": 150000.0, "totalPrice": 150000.0 },
      { "id": 2, "articleId": 92, "quantity": 3, "unitPrice": 41666.67, "totalPrice": 125000.0 }
    ]
  }
}
