### **Demande d'Évolution de l'API Tontine : Pagination et Filtrage des Membres**

**Destinataires :** Équipe de développement Backend

**Date :** 23 novembre 2025

**Auteur :** Équipe de développement Frontend

#### **1. Contexte**

Actuellement, le tableau de bord de la tontine (`tontine-dashboard`) charge l'intégralité de la liste des membres de la tontine via un appel API. Les fonctionnalités de recherche et de filtrage sont implémentées localement (côté client) dans les composants `app-tontine-member-table` et `app-tontine-filter-bar`.

Cette approche présente des limitations majeures :
*   **Problèmes de performance :** Le chargement de tous les membres peut être très lent et consommer beaucoup de mémoire si le nombre de membres est élevé.
*   **Scalabilité limitée :** L'application deviendra inutilisable à mesure que la base de données grandira.
*   **Filtrage incorrect :** Le filtrage local ne s'applique qu'aux données déjà chargées, et non à l'ensemble des enregistrements présents en base de données.

Pour résoudre ces problèmes, nous demandons une évolution de l'API pour prendre en charge la pagination, la recherche et le filtrage côté serveur.

#### **2. Proposition d'Évolution de l'API**

Nous proposons de faire évoluer l'endpoint existant qui retourne la liste des membres, vraisemblablement `GET /api/tontine/members` (à confirmer), pour qu'il accepte des paramètres de requête (query parameters).

##### **Nouveaux Paramètres de Requête**

L'endpoint devrait accepter les paramètres optionnels suivants :

| Paramètre | Type | Description | Défaut |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | Le numéro de la page souhaitée. Commence à `1`. | `1` |
| `pageSize` | `integer` | Le nombre d'éléments à retourner par page. | `10` |
| `search` | `string` | Une chaîne de caractères pour la recherche. Le backend devrait rechercher cette chaîne dans les champs pertinents comme le nom, le prénom, le téléphone ou le code client. | `null` |
| `deliveryStatus` | `string` | Filtre les membres en fonction de leur statut de livraison. Les valeurs possibles pourraient être `SESSION_INPROGRESS`, `DELIVERED`, `VALIDATED`, etc. (liste à confirmer par le backend). | `null` |
| `sortBy` | `string` | Le champ sur lequel trier les résultats (ex: `client.lastname`). | `id` |
| `sortOrder`| `string` | L'ordre de tri. Valeurs possibles : `asc` ou `desc`. | `asc` |

##### **Structure de la Réponse Attendue**

En retour, l'API ne doit plus seulement renvoyer un tableau de membres, mais un objet contenant les données de la page actuelle ainsi ainsi que les informations de pagination.

```json
{
  "content": [
    {
      "id": 1,
      "client": {
        "firstname": "John",
        "lastname": "Doe",
        "phone": "123456789"
      },
      "amount": 50000,
      "deliveryStatus": "SESSION_INPROGRESS",
      "rank": 1
      // ... autres champs du membre
    },
    {
      "id": 2,
      "client": {
        "firstname": "Jane",
        "lastname": "Smith",
        "phone": "987654321"
      },
      "amount": 50000,
      "deliveryStatus": "DELIVERED",
      "rank": 2
      // ... autres champs du membre
    }
    // ...
  ],
  "page": 1,
  "pageSize": 10,
  "totalElements": 150,
  "totalPages": 15
}
```

#### **3. Exemples d'Appels API**

1.  **Charger la première page avec 10 membres :**
    `GET /api/tontine/members?page=1&pageSize=10`

2.  **Rechercher "Dupont" sur la deuxième page :**
    `GET /api/tontine/members?search=Dupont&page=2&pageSize=20`

3.  **Filtrer les membres livrés (`DELIVERED`) et les trier par nom de famille :**
    `GET /api/tontine/members?deliveryStatus=DELIVERED&sortBy=client.lastname&sortOrder=asc`

4.  **Cas complexe : rechercher "Martin", filtrer par statut "validé" et afficher la page 3 :**
    `GET /api/tontine/members?search=Martin&deliveryStatus=VALIDATED&page=3&pageSize=10`

#### **4. Conclusion**

L'implémentation de ces changements côté backend est cruciale pour améliorer les performances, la scalabilité et l'expérience utilisateur de notre application. Le frontend se basera sur cette nouvelle structure pour mettre à jour l'interface de la liste des membres.

Nous restons à votre disposition pour toute question ou clarification.

Cordialement,

L'équipe Frontend