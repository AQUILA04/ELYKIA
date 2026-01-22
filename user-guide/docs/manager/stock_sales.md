# Stocks, Ventes et Commandes

C'est le cœur du réacteur. Ici, nous gérons le flux de marchandises (du stock vers le client) et le flux d'argent (la vente).

---

## 1. Votre Catalogue (Articles)

Le menu **Articles**, c'est votre vitrine. Il liste tout ce que vous pouvez vendre.

### a. Consulter le catalogue
La liste vous montre tous vos produits avec leur marque, modèle et type.

![Liste des Articles](../images/manager/10_articles_list.png)

### b. Ajouter un produit
Pour ajouter un nouveau produit :
1.  Cliquez sur **Ajouter**.
2.  Définissez bien son identité (Nom, Marque) et surtout ses **Prix** (Achat, Vente Comptant, Vente Crédit).
3.  N'oubliez pas les seuils d'alerte stock pour être prévenu avant la rupture !

![Nouvel Article](../images/manager/10_article_add.png)

Votre catalogue est prêt. Il faut maintenant distribuer ces produits.

---

## 2. Le Stock Commercial (La Marchandise Ambulante)

Vos commerciaux partent sur le terrain avec de la marchandise. Vous devez savoir exactement ce qu'ils ont.

### a. Donner du stock (Approvisionnement)
Un commercial a besoin de produits ?
1.  Allez dans **Stock Commercial > Demandes Sortie**.
2.  Créez une **Nouvelle Demande** pour lui.
3.  **Important** : Une fois la demande créée, vous devez la **VALIDER** (bouton vert).
    *   *Pourquoi ?* Tant que vous ne validez pas, le magasinier ne voit rien et ne peut pas livrer la marchandise.

![Création Demande Sortie](../images/manager/11b_stock_request_create.png)

### b. Surveiller le stock des agents
Allez dans **Stock Commercial > Stock**.
Ce tableau est redoutable. Il vous dit pour chaque commercial :
*   Ce qu'il a pris.
*   Ce qu'il a vendu.
*   Ce qu'il doit encore avoir dans les mains (**Restant**).

*Conseil : En fin de journée, jetez un œil ici. Si un commercial dit "J'ai tout vendu" mais que le tableau dit le contraire, il y a un problème.*

![Dashboard Stock Commercial](../images/manager/11c_stock_dashboard.png)

### c. Gérer les Retours
Si un commercial ramène des invendus, cela apparaît dans **Stock Commercial > Retours**.
Vérifiez que le magasinier a bien validé la réception pour que le stock de l'agent soit mis à jour.

![Liste des Retours](../images/manager/11d_stock_return_list.png)

Vous savez où est votre stock. Voyons les spécificités de la Tontine.

---

## 3. Le Stock Tontine

C'est exactement le même principe que le Stock Commercial, mais pour les produits réservés à la Tontine.
Veillez bien à ne pas mélanger les deux stocks physiquement !

![Dashboard Stock Tontine](../images/manager/12c_stock_tontine_dashboard.png)

---

## 4. Les Commandes (Le Sas de Validation)

Avant de devenir une vente ferme, une demande client passe souvent par la case "Commande". C'est ici que vous donnez votre feu vert.

### a. Votre rôle de contrôleur
Allez dans le menu **Commandes**.
Regardez les indicateurs en haut : **Commandes en Attente**. C'est votre "To-Do List".

![Liste des Commandes](../images/manager/15_orders_list.png)

### b. Créer une commande
Vous pouvez aussi créer une commande vous-même pour un client :
1.  Cliquez sur **Ajouter**.
2.  Choisissez le client et remplissez son panier.
3.  Enregistrez. Elle passe en attente de validation.

![Création Commande](../images/manager/15_order_add.png)

### c. Valider et Vendre
1.  Ouvrez une commande en attente (l'œil).
2.  Vérifiez tout : Est-ce le bon client ? Les bons prix ?
3.  Si c'est bon, cliquez sur **Valider**. La commande est acceptée.
4.  Pour finaliser la transaction, cliquez sur **Transformer en Vente**.
    *   *Attention : À ce moment-là, le stock sort et la dette client est créée. C'est irréversible.*

![Détails Commande](../images/manager/15b_order_details.png)

La vente est actée. Mais est-ce que le stock physique suit ? C'est l'heure de l'inventaire.

---

## 5. Les Inventaires (L'Heure de Vérité)

Régulièrement, il faut vérifier que le stock de l'ordinateur correspond au stock réel de l'entrepôt.

**Comment faire un inventaire sans douleur ?**

1.  **Figer** : Créez un nouvel inventaire. Le système prend une "photo" du stock théorique.
2.  **Compter** : Imprimez la fiche (PDF) et allez compter dans l'entrepôt. Ne regardez pas les chiffres de l'ordi pour ne pas être influencé !
3.  **Saisir** : Revenez et entrez vos chiffres réels dans le système.
4.  **Réconcilier** : Le système va vous montrer les écarts.
    *   Il y en a plus ? Tant mieux (Surplus).
    *   Il en manque ? Aïe. Vous devez justifier pourquoi (Vol ? Perte ? Erreur ?).
5.  **Clôturer** : Une fois tout justifié, validez. Le stock réel devient la nouvelle référence.

![Liste des Inventaires](../images/manager/19_inventory_list.png)

### Ajouter du stock (Entrées)
Pour ajouter du stock venant d'un fournisseur (hors inventaire), utilisez le bouton **+ Entrées**.

![Entrée de Stock](../images/manager/19_inventory_add.png)

Votre stock est carré. Terminons par les ventes directes.

---

## 6. Les Ventes Directes

Parfois, vous vendez directement au comptoir, sans passer par un commercial terrain.

### a. Créer une vente
1.  Allez dans **Ventes** et cliquez sur **+**.
2.  Choisissez **Comptant** (si le client paie tout de suite) ou **Crédit**.
3.  Remplissez le panier et validez.

### b. Suivre les ventes
Dans la liste des ventes, vous pouvez suivre la vie de chaque crédit : combien le client a déjà payé, combien il reste, et s'il est en retard.
Utilisez la **Recherche Avancée** (la loupe) pour filtrer par statut ou par commercial.

![Liste des Ventes](../images/manager/13_sales_list.png)

Vous maîtrisez maintenant tout le cycle commercial.
