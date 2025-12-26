# Plan d'Implémentation : Cycle de Vie de la Tontine

Ce document détaille les étapes nécessaires pour implémenter la gestion complète du cycle de vie des tontines, de la session à la livraison.

---

### Étape 1 : Mise à jour des Énumérations et Entités

1.  **Créer/Modifier les Énumérations de Statut :**
    *   Créer `TontineSessionStatus` dans le package `enumaration` avec les valeurs : `ACTIVE`, `CLOSED`, `ENDED`.
    *   Créer `TontineMemberDeliveryStatus` dans le package `enumaration` avec les valeurs : `SESSION_INPROGRESS`, `PENDING`, `VALIDATED`, `DELIVERED`.

2.  **Mettre à jour les Entités :**
    *   Dans `TontineSession.java`, ajouter le champ `status` de type `TontineSessionStatus` avec la valeur par défaut `ACTIVE`.
    *   Dans `TontineMember.java`, remplacer le `deliveryStatus` existant (s'il est de type String ou autre) par un champ de type `TontineMemberDeliveryStatus` avec la valeur par défaut `SESSION_INPROGRESS`.

---

### Étape 2 : Scheduler pour la Clôture des Sessions

1.  **Créer un Scheduler (`TontineSessionScheduler`) :**
    *   Dans le package `scheduler`, créer une nouvelle classe.
    *   Implémenter une méthode annotée avec `@Scheduled` (ex: `cron = "0 0 1 * * ?"` pour une exécution quotidienne à 1h du matin).
    *   Cette méthode recherchera toutes les `TontineSession` avec le statut `ACTIVE` dont la `endDate` est antérieure à la date actuelle.
    *   Pour chaque session trouvée, le statut sera mis à jour à `CLOSED`.

---

### Étape 3 : Intégration du `CreditService`

1.  **Créer une nouvelle Énumération `OperationType` :**
    *   Ajouter la valeur `TONTINE` à l'énumération `OperationType` (si elle n'existe pas déjà).

2.  **Développer la méthode `createTontineCredit` dans `CreditService` :**
    *   Créer une nouvelle méthode `public Credit createTontineCredit(TontineDelivery delivery)`.
    *   Cette méthode s'inspirera de `createCredit` mais appliquera les règles spécifiques :
        *   `OperationType` = `TONTINE`
        *   `status` = `SETTLED`
        *   `totalAmount` = `delivery.getTotalAmount()`
        *   `totalAmountPaid` = `delivery.getTotalAmount()`
        *   `totalAmountRemaining` = 0
        *   `totalPurchase` = Calculer la somme des `purchasePrice` des `TontineDeliveryItem`.
        *   `dailyStake` = `delivery.getTotalAmount()`
        *   Toutes les dates (`beginDate`, `expectedEndDate`, `effetiveEndDate`) = `LocalDate.now()`
        *   `solvencyNote` = `TIME`
        *   `remainingDaysCount` = 0
        *   `dailyPaid` = `true`
        *   `clientType` = `CLIENT`
        *   `updatable` = `false`
        *   `reference` = Générer une référence commençant par "T".
        *   `accountingDate` et `releaseDate` = `accountingDayService.getCurrentAccountingDay().getDate()`
        *   `client` = `delivery.getTontineMember().getClient()`
        *   `collector` = `delivery.getTontineMember().getClient().getCollector()`

---

### Étape 4 : Historisation des Mouvements de Compte Client

1.  **Créer l'entité `ClientAccountMovement` :**
    *   Champs : `id`, `client`, `amount`, `movementType` (ex: `TONTINE_DELIVERY_DEPOSIT`), `creationDate`, `tontineDelivery`.
    *   Générer le `repository` associé.

2.  **Créer un `ClientAccountService` :**
    *   Méthode `public void recordMovement(Client client, double amount, String movementType, TontineDelivery delivery)`.
    *   Cette méthode créera et sauvegardera une nouvelle instance de `ClientAccountMovement`.

---

### Étape 5 : Développement des APIs de Livraison

1.  **API de Création de Livraison (`POST /api/v1/tontine-deliveries`) :**
    *   Prend un `CreateDeliveryDto` en entrée.
    *   Vérifier que la `TontineSession` associée est `CLOSED`. Sinon, refuser l'opération.
    *   Créer l'entité `TontineDelivery` et ses `TontineDeliveryItem`.
    *   Déterminer le statut initial de `TontineMemberDeliveryStatus` : `VALIDATED` si l'utilisateur est "GESTIONNAIRE", sinon `PENDING`.
    *   Si le statut est `VALIDATED`, appeler immédiatement `creditService.createTontineCredit(delivery)`.
    *   Sauvegarder la livraison.

2.  **API de Validation de Livraison (`PATCH /api/v1/tontine-deliveries/{deliveryId}/validate`) :**
    *   Accessible uniquement aux "GESTIONNAIRE".
    *   Rechercher la `TontineDelivery`.
    *   Vérifier que le statut actuel est `PENDING`.
    *   Changer le statut du `TontineMember` à `VALIDATED`.
    *   Appeler `creditService.createTontineCredit(delivery)`.

3.  **API de Liste des Livraisons à effectuer (`GET /api/v1/tontine-deliveries/validated`) :**
    *   Retourne une liste paginée des `TontineDelivery` (ou `TontineMemberDto`) dont le statut est `VALIDATED`.
    *   Accessible aux "MAGASINIER".

4.  **API de Finalisation de Livraison (`PATCH /api/v1/tontine-deliveries/{deliveryId}/deliver`) :**
    *   Accessible aux "MAGASINIER".
    *   Rechercher la `TontineDelivery`.
    *   Vérifier que le statut est `VALIDATED`.
    *   Changer le statut du `TontineMember` à `DELIVERED`.
    *   Ajouter `delivery.getRemainingBalance()` à l'`account.accountBalance` du client.
    *   Appeler `clientAccountService.recordMovement(...)` pour historiser la transaction.
    *   Vérifier si toutes les livraisons de la session sont `DELIVERED` pour potentiellement changer le statut de la session à `ENDED`.

---

### Étape 6 : Mise à jour du Statut `ENDED` de la Session

1.  **Ajouter une logique de vérification :**
    *   Après chaque passage d'une livraison au statut `DELIVERED`, vérifier si tous les autres membres de la même session ont également le statut `DELIVERED`.
    *   Si c'est le cas, mettre le statut de la `TontineSession` à `ENDED`.

2.  **Ajouter un Scheduler pour la fin d'année :**
    *   Créer un second job dans `TontineSessionScheduler` qui s'exécute le 31 décembre.
    *   Ce job passera toutes les sessions `CLOSED` à `ENDED`.

---
