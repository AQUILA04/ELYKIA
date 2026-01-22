# Ventes et Commandes

C'est ici que tout se concrétise ! Nous allons voir comment enregistrer vos contrats de vente et gérer les commandes de vos clients.

Il y a une distinction importante à faire :
*   Une **Vente** est un contrat ferme : le client part avec la marchandise, et la dette est créée.
*   Une **Commande** est une réservation : le client veut le produit, mais la transaction n'est pas encore finalisée.

---

## 1. Réaliser une Vente (Le Contrat)

C'est l'opération que vous ferez le plus souvent. Allez dans le menu **Ventes**.

Vous arrivez sur la liste de tous vos contrats passés. Vous pouvez voir rapidement qui a payé (**Soldé**) et qui est encore en train de rembourser (**En cours**).

### Comment créer un nouveau contrat ?

1.  Cliquez sur le bouton **Ajouter**.
2.  Le formulaire de vente s'ouvre.
    *   **Type de Vente** : Choisissez "Crédit" (c'est le plus courant) ou "Comptant".
    *   **Qui vend ?** Sélectionnez votre nom dans la liste des commerciaux.
    *   **A qui ?** Cherchez votre client.
    *   **Quoi ?** Ajoutez les articles. Le système vous montrera le prix correspondant au mode de vente choisi.
        *   *Attention : Vous ne pouvez vendre que ce que vous avez réellement dans votre stock personnel !*
    *   **L'Avance** : Si le client verse un premier acompte tout de suite, notez-le ici.

3.  Tout est bon ? Cliquez sur **Valider**.

Le système s'occupe du reste : il génère le contrat, calcule l'échéancier de paiement pour le client, et retire les produits de votre stock.

![Formulaire nouvelle vente](../images/commercial_sale_add.png)

Félicitations, votre vente est enregistrée !

---

## 2. Gérer les Commandes

Parfois, un client veut réserver un produit que vous n'avez pas encore, ou il réfléchit. Utilisez le menu **Commandes** pour cela.

### Prendre une commande

1.  Cliquez sur **Créer une Commande**.
2.  C'est très simple : trouvez le client, ajoutez les articles qu'il souhaite, et validez.
3.  La commande est enregistrée avec le statut *Créé*. Elle n'impacte pas encore votre stock ni le compte du client.

![Formulaire commande](../images/commercial_order_create.png)

### Transformer l'essai

Le client est prêt à conclure ? Parfait ! Vous n'avez pas besoin de tout ressaisir.

1.  Ouvrez la commande en question.
2.  Dans le menu d'actions, choisissez **Transformer en Vente**.
3.  Confirmez.

La commande devient instantanément un contrat de vente officiel. C'est un gain de temps précieux sur le terrain.

Vous savez maintenant gérer tout le cycle de vente. Passons à un produit spécifique : la Tontine.
