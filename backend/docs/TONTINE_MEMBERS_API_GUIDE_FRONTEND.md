# Guide d'API pour la gestion des Membres de Tontine (Backend Evolution)

**Date :** 23 novembre 2025

**Auteur :** Équipe Backend

Ce document détaille les évolutions apportées à l'API de gestion des membres de tontine suite à la demande de l'équipe Frontend, notamment l'ajout de la pagination, de la recherche et du filtrage côté serveur.

---

## 1. Endpoint Modifié

L'endpoint existant pour récupérer la liste des membres de tontine a été enrichi pour accepter de nouveaux paramètres de requête.

**Ancien Endpoint :** `GET /api/v1/tontines/members`
**Nouvel Endpoint :** `GET /api/v1/tontines/members`

### Paramètres de Requête (Query Parameters)

Tous les paramètres sont optionnels.

| Paramètre     | Type      | Description                                                                                                                                                                                                                                           | Défaut | 
| :------------ | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | 
| `page`        | `integer` | Le numéro de la page souhaitée. Commence à `0` (convention Spring Data JPA). Si omis, la première page est retournée.                                                                                                                                     | `0`    | 
| `size`        | `integer` | Le nombre d'éléments à retourner par page. Si omis, une taille de page par défaut est utilisée par Spring Data JPA (généralement `20`).                                                                                                                 | `20`   | 
| `sort`        | `string`  | Indique le champ sur lequel trier les résultats et l'ordre de tri, au format `fieldName,direction` (ex: `client.lastname,asc`, `registrationDate,desc`). Peut être répété pour un tri sur plusieurs champs.                                                 | `id,asc` | 
| `search`      | `string`  | Une chaîne de caractères pour la recherche. Le backend recherche cette chaîne dans les champs suivants du client : `firstname`, `lastname`, `phone`, `code`. La recherche est insensible à la casse.                                                     | `null` | 
| `deliveryStatus`| `string`  | Filtre les membres en fonction de leur statut de livraison. Les valeurs possibles sont : `SESSION_INPROGRESS`, `PENDING`, `VALIDATED`, `DELIVERED`. La valeur fournie doit correspondre exactement à l'une de ces chaînes (insensible à la casse non gérée pour ce paramètre). | `null` | 

### Exemple de Requêtes (cURL)

1.  **Charger la première page (index 0) avec 10 membres :**
    ```bash
    curl -X GET "http://localhost:8080/api/v1/tontines/members?page=0&size=10" \
      -H "accept: */*" \
      -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
    ```

2.  **Rechercher "Dupont" et trier par nom de famille ascendant :**
    ```bash
    curl -X GET "http://localhost:8080/api/v1/tontines/members?search=Dupont&sort=client.lastname,asc" \
      -H "accept: */*" \
      -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
    ```

3.  **Filtrer les membres livrés (`DELIVERED`) sur la deuxième page (index 1) avec 5 éléments par page :**
    ```bash
    curl -X GET "http://localhost:8080/api/v1/tontines/members?deliveryStatus=DELIVERED&page=1&size=5" \
      -H "accept: */*" \
      -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
    ```

4.  **Cas complexe : rechercher "Martin", filtrer par statut "VALIDATED" et trier par date d'enregistrement décroissante :**
    ```bash
    curl -X GET "http://localhost:8080/api/v1/tontines/members?search=Martin&deliveryStatus=VALIDATED&sort=registrationDate,desc" \
      -H "accept: */*" \
      -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
    ```

## 2. Structure de la Réponse Attendue

L'API renverra un objet `Response` standard qui encapsule l'objet `Page` de Spring Data JPA dans son champ `data`.

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
                "totalContribution": 150000.0,
                "registrationDate": "2025-01-15T10:30:00",
                "deliveryStatus": "SESSION_INPROGRESS",
                "tontineSession": {
                    "id": 101,
                    "year": 2025,
                    "startDate": "2025-02-01",
                    "endDate": "2025-11-30",
                    "status": "ACTIVE"
                },
                "client": {
                    "id": 201,
                    "code": "CLI001",
                    "firstname": "John",
                    "lastname": "Doe",
                    "phone": "123456789",
                    "address": "123 Main St",
                    "collector": "promoter_john"
                }
            }
        ],
        "pageable": {
            "pageNumber": 0,
            "pageSize": 10,
            "sort": {
                "empty": false,
                "sorted": true,
                "unsorted": false
            },
            "offset": 0,
            "paged": true,
            "unpaged": false
        },
        "last": false,
        "totalPages": 15,
        "totalElements": 145,
        "size": 10,
        "number": 0,
        "sort": {
            "empty": false,
            "sorted": true,
            "unsorted": false
        },
        "first": true,
        "numberOfElements": 10,
        "empty": false
    }
}
```

**Remarque :** Le champ `client` inclura les détails complets du client. Les champs `totalContribution`, `registrationDate`, `deliveryStatus`, et `tontineSession` seront également présents pour chaque membre de tontine.

---

Cordialement,

L'équipe Backend
