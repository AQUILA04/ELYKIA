# Documentation de l'API : Gestion des Tontines

## 1. Vue d'ensemble

Ce document décrit les points d'accès de l'API (backend) pour la gestion du module de Tontine. Ce module permet aux commerciaux d'enregistrer des clients à des sessions de tontine annuelles, de collecter leurs cotisations et de gérer la livraison de fin d'année.

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

## 3. Modèles de Données (JSON)

Voici la structure des objets de données principaux tels que retournés **à l'intérieur du champ `data`** de la réponse API.

### TontineSession

Représente une session de tontine pour une année donnée.

```json
{
  "id": 1,
  "createdBy": "user",
  "createdDate": "2025-10-08T12:00:00",
  "lastModifiedBy": "user",
  "lastModifiedDate": "2025-10-08T12:00:00",
  "state": "ENABLED",
  "year": 2025,
  "startDate": "2025-01-15",
  "endDate": "2025-12-15",
  "status": "ACTIVE"
}
```

### TontineMember

Lie un `Client` à une `TontineSession` et suit le total de ses contributions.

```json
{
  "id": 1,
  "createdBy": "user",
  "createdDate": "2025-10-08T15:00:00",
  // ... autres champs d'audit ...
  "tontineSession": { /* ... objet TontineSession ... */ },
  "client": { /* ... objet Client ... */ },
  "totalContribution": 50000.0,
  "deliveryStatus": "PENDING",
  "registrationDate": "2025-10-08T15:00:00"
}
```

### TontineCollection

Représente un paiement de cotisation individuel.

```json
{
  "id": 10,
  "createdBy": "user",
  "createdDate": "2025-10-08T15:30:00",
  // ... autres champs d'audit ...
  "tontineMember": { /* ... objet TontineMember ... */ },
  "amount": 5000.0,
  "collectionDate": "2025-10-08T15:30:00",
  "commercialUsername": "commercial1"
}
```

### Gestion Implicite de la Session

Il est important de noter qu'il n'est pas nécessaire de créer manuellement une session de tontine. La session pour l'année en cours est **automatiquement créée** en arrière-plan lors de la première opération qui la requiert (par exemple, l'enregistrement du premier membre de l'année).

---

## 4. Points d'accès de l'API (Endpoints)

Tous les points d'accès sont préfixés par `/api/v1/tontines` et requièrent une authentification par jeton (Bearer Token).

### 4.1 Enregistrer un client à la tontine

Enregistre un client à la session de tontine de l'année en cours.

- **Method :** `POST`
- **URL :** `/api/v1/tontines/members`
- **Request Body :**

```json
{
  "clientId": 123
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
    "id": 1,
    "client": { "id": 123, "firstname": "John", "lastname": "Doe", ... },
    "totalContribution": 0.0,
    "deliveryStatus": "PENDING",
    "registrationDate": "2025-10-08T15:00:00"
    // ... et autres champs de TontineMember
  }
}
```

- **Réponse (Erreur 400 Bad Request) :**

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Ce client est déjà enregistré pour la session de tontine de cette année.",
  "service": "optimize-elykia-core",
  "data": null
}
```

### 4.2 Lister les membres de la tontine pour le commercial

Récupère une liste paginée des clients enregistrés à la tontine pour l'année en cours, pour le commercial actuellement authentifié.

- **Method :** `GET`
- **URL :** `/api/v1/tontines/members`
- **Paramètres de requête (Query Params) :**
  - `page` : Numéro de la page (ex: `0`)
  - `size` : Taille de la page (ex: `20`)
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra un objet `Page` avec la liste des `TontineMember`.

### 4.3 Enregistrer une cotisation

Enregistre un paiement de cotisation pour un membre de la tontine.

- **Method :** `POST`
- **URL :** `/api/v1/tontines/collections`
- **Request Body :**

```json
{
  "memberId": 1,
  "amount": 5000.0
}
```

- **Réponse (Succès 201 CREATED) :** Le champ `data` contiendra l'objet `TontineCollection` complet.

### 4.4 Consulter l'historique des cotisations d'un membre

Récupère une liste paginée de toutes les cotisations pour un membre spécifique.

- **Method :** `GET`
- **URL :** `/api/v1/tontines/members/{memberId}/collections`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra un objet `Page` avec la liste des `TontineCollection`.

### 4.5 Marquer une livraison comme effectuée

Met à jour le statut de livraison d'un membre à `DELIVERED`.

- **Method :** `PATCH`
- **URL :** `/api/v1/tontines/members/{memberId}/deliver`
- **Réponse (Succès 200 OK) :** Le champ `data` contiendra l'objet `TontineMember` mis à jour.

### 4.6 Modifier la session de tontine de l'année en cours

Permet de modifier les dates de début et de fin de la session de tontine pour l'année en cours.

- **Method :** `PUT`
- **URL :** `/api/v1/tontines/sessions/current`
- **Request Body :**

```json
{
  "startDate": "2025-01-15",
  "endDate": "2025-12-15"
}
```

- **Réponse (Succès 200 OK) :** Le champ `data` contiendra l'objet `TontineSession` mis à jour.
