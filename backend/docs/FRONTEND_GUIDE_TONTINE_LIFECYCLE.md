# Guide pour le Frontend : Évolution du Cycle de Vie de la Tontine

Ce document décrit les changements apportés au backend pour la gestion des tontines. L'objectif est d'implémenter un cycle de vie complet pour les sessions et les livraisons, avec une gestion des statuts plus fine et des APIs spécifiques à chaque étape.

---

### 1. Vue d'ensemble du Nouveau Cycle de Vie

La gestion de la tontine est maintenant divisée en deux cycles de vie principaux : celui de la **Session de Tontine** et celui de la **Livraison du Membre**.

#### a. Cycle de Vie de la Session (`TontineSessionStatus`)
Une session de tontine a maintenant 3 états, gérés principalement par le backend :
-   `ACTIVE`: La session est en cours. On peut y ajouter des membres et enregistrer des collectes.
-   `CLOSED`: La session est terminée (sa date de fin est passée). Les collectes ne sont plus possibles, mais on peut maintenant créer les livraisons pour les membres.
-   `ENDED`: La session est archivée. Toutes les livraisons ont été effectuées ou l'année est terminée. Aucune opération n'est plus possible.

**Impact Frontend :**
-   Le statut de la session doit être affiché dans l'interface.
-   Le bouton "Créer une livraison" pour un membre ne doit être activé **que si la session de ce membre a le statut `CLOSED`**.

#### b. Cycle de Vie de la Livraison (`TontineMemberDeliveryStatus`)
Le statut de livraison d'un membre de tontine a été enrichi pour suivre un processus en plusieurs étapes :
-   `SESSION_INPROGRESS`: Statut par défaut tant que la session de tontine est `ACTIVE`. Aucune livraison possible.
-   `PENDING`: Une livraison a été créée pour le membre mais attend la validation d'un gestionnaire.
-   `VALIDATED`: La livraison a été validée par un gestionnaire. Elle est prête à être préparée et servie par le magasinier.
-   `DELIVERED`: Le membre a reçu sa livraison.

**Impact Frontend :**
-   Le frontend doit afficher ce nouveau statut pour chaque membre.
-   Les actions possibles (boutons) dépendront de ce statut et du rôle de l'utilisateur.

---

### 2. Modifications des APIs et du Workflow

Le workflow de livraison a été entièrement revu. Voici les APIs à utiliser et la logique associée.

#### **Étape 1 : Création de la Livraison**
-   **Endpoint :** `POST /api/v1/tontines/deliveries`
-   **Objectif :** Créer une demande de livraison pour un membre.
-   **Condition :** Ne fonctionne que si la session de tontine du membre est `CLOSED`.
-   **Corps de la requête (`CreateDeliveryDto`) :**
    ```json
    {
      "tontineMemberId": 123,
      "items": [
        {
          "articleId": 1,
          "quantity": 2,
          "unitPrice": 25000.0
        }
      ]
    }
    ```
-   **Comportement :**
    -   Si l'utilisateur est un simple commercial, le statut de livraison du membre passe à `PENDING`.
    -   Si l'utilisateur est un `GESTIONNAIRE` ou `ADMIN`, le statut passe directement à `VALIDATED`.
-   **Action Frontend :** Le formulaire de création de livraison doit appeler cet endpoint.

#### **Étape 2 : Validation de la Livraison (pour les gestionnaires)**
-   **Endpoint :** `PATCH /api/v1/tontines/deliveries/{deliveryId}/validate`
-   **Objectif :** Valider une livraison qui est en statut `PENDING`.
-   **Condition :** Réservé aux utilisateurs avec le rôle `ROLE_GESTIONNAIRE` ou `ROLE_ADMIN`.
-   **Comportement :** Le statut de livraison du membre passe à `VALIDATED`.
-   **Action Frontend :** Afficher un bouton "Valider" sur les livraisons `PENDING` pour les utilisateurs autorisés.

#### **Étape 3 : Liste des Livraisons à Servir (pour les magasiniers)**
-   **Endpoint :** `GET /api/v1/tontines/deliveries/validated`
-   **Objectif :** Obtenir la liste paginée des livraisons qui ont été validées et qui sont prêtes à être servies.
-   **Condition :** Réservé aux utilisateurs avec le rôle `ROLE_MAGASINIER`.
-   **Réponse :** Une page (`Page<TontineDeliveryDto>`) contenant les livraisons avec le statut `VALIDATED`.
-   **Action Frontend :** Utiliser cet endpoint pour construire l'interface du magasinier listant les livraisons à préparer.

#### **Étape 4 : Finalisation de la Livraison (pour les magasiniers)**
-   **Endpoint :** `PATCH /api/v1/tontines/deliveries/{deliveryId}/deliver`
-   **Objectif :** Marquer une livraison comme "servie".
-   **Condition :** Réservé aux utilisateurs avec le rôle `ROLE_MAGASINIER`. La livraison doit être au statut `VALIDATED`.
-   **Comportement :** Le statut de livraison du membre passe à `DELIVERED`.
-   **Action Frontend :** Afficher un bouton "Marquer comme Livré" sur les livraisons `VALIDATED` pour les utilisateurs autorisés.

#### **Consultation de la Livraison d'un Membre**
-   **Endpoint :** `GET /api/v1/tontines/deliveries/member/{tontineMemberId}`
-   **Changement :** Le paramètre de chemin est maintenant `tontineMemberId` (au lieu de `memberId`).
-   **Réponse (`TontineDeliveryDto`) :** Cet objet contient maintenant le champ `deliveryStatus`.

---

### 3. Changements dans les Objets de Données (DTOs)

-   **`TontineDeliveryDto`** :
    -   Le champ `memberId` a été renommé en `tontineMemberId`. **Attention à mettre à jour toutes les utilisations.**
    -   Nouveau champ : `deliveryStatus` (String) : `"SESSION_INPROGRESS"`, `"PENDING"`, `"VALIDATED"`, `"DELIVERED"`. Utilisez ce champ pour afficher le statut actuel de la livraison du membre.

-   **`CreateDeliveryDto`** :
    -   Nouveau DTO pour la création de livraison, utilisant `tontineMemberId`.

-   **`DeliveryItemDto`** :
    -   Contient maintenant le champ `unitPrice`, qui doit être fourni lors de la création d'une livraison.

### 4. Résumé des Actions Frontend par Rôle

-   **Gestionnaire / Admin :**
    -   Peut créer une livraison qui devient directement `VALIDATED`.
    -   Doit voir un bouton **"Valider"** sur les livraisons `PENDING` créées par d'autres.

-   **Magasinier (`ROLE_MAGASINIER`) :**
    -   Doit avoir une page dédiée listant les livraisons `VALIDATED` (via `GET /api/v1/tontines/deliveries/validated`).
    -   Sur cette page, chaque livraison doit avoir un bouton **"Marquer comme Livré"**.

-   **Interface Générale :**
    -   Toutes les vues listant des membres de tontine doivent afficher le nouveau `deliveryStatus`.
    -   La logique d'affichage des boutons d'action doit être mise à jour pour correspondre au nouveau cycle de vie et aux rôles des utilisateurs.
