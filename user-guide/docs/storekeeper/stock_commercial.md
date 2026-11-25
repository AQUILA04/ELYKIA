# Gestion physique du stock (Sorties & Retours)

Le magasinier est l'acteur clé de la délivrance physique des articles aux commerciaux. Aucune marchandise ne doit quitter le magasin sans bon de sortie validé, et aucun retour ne doit être réintégré sans contrôle contradictoire de son état physique.

Le menu **Stock Commercial** regroupe les sorties, le stock et les retours. Sur chaque écran, le sélecteur **Crédit** / **Tontine** (sous le titre) recharge la liste pour le stock choisi.

1. Ouvrez **Stock Commercial**, puis **Demandes Sortie**, **Stock** ou **Retours**.
2. Cliquez sur **Crédit** pour les ventes, ou sur **Tontine** pour les livraisons de fin de cycle.
3. Les filtres, le tableau et les boutons (**Voir**, **Livrer**, **Annuler**, **Réceptionner**, **Télécharger**) s'appliquent au choix affiché.

---

## 1. Servir et livrer une demande de sortie (Menu Stock Commercial > Demandes Sortie)

Choisissez **Crédit** sur le sélecteur avant de préparer une sortie de vente.

Toutes les demandes de sortie validées par la gestion arrivent dans le menu **Stock Commercial > Demandes Sortie** (accessible si vous disposez des habilitations requises).

<!-- CAPTURE À INSÉRER : Demande de sortie au statut Validée avec le bouton Livrer visible pour le magasinier. -->

### A. Contrôle avant remise physique
1. Filtrez la liste des demandes par statut ou par commercial pour localiser la commande à préparer.
2. Cliquez sur **« Voir »** pour ouvrir le détail de la demande :
   * La référence s'affiche en haut de la fenêtre.
   * Vérifiez la liste exacte des articles et les quantités commandées.
   * Assurez-vous que le statut est bien **Validée**.
   * Si la sortie ne doit pas être remise, cliquez sur **« Annuler »** en bas de la fenêtre, puis confirmez. La demande passe au statut **Annulée**. La marchandise reste au magasin.
   * Cliquez sur **« Télécharger »** pour enregistrer la fiche de sortie de cette demande.
3. Prélevez les articles en rayon et regroupez-les dans la zone de délivrance.

### B. Remise physique et validation du départ (`Livrer`)
1. Sur la liste, une demande **Validée** propose **Livrer** et **Annuler**. Choisissez **Annuler** puis confirmez si la sortie ne part pas. La demande passe au statut **Annulée** et le stock du magasin ne change pas.
2. Procédez au comptage contradictoire avec le commercial présent au comptoir.
3. Cliquez sur le bouton bleu **« Livrer »**.
4. **Conséquences automatiques** :
   * Le statut de la demande passe définitivement à **Livrée**.
   * Le stock physique du magasin est automatiquement débité.
   * Le stock commercial du destinataire est automatiquement crédité.
   * La date et l'heure précises de livraison sont horodatées.
5. Cliquez sur l'icône de téléchargement pour imprimer la **Fiche de sortie PDF** signée par les deux parties.

### C. Vente au comptant

Une vente payée au comptoir apparaît dans la même liste, déjà au statut **Validée**.

1. Repérez la ligne marquée **Vente comptant** et la référence de la vente.
2. Cliquez sur **Voir** et préparez toutes les quantités. La remise se fait en une seule fois, au client.
3. Cliquez sur **Livrer** et confirmez.
4. La vente passe à **Clôturé**. Le stock du magasin diminue.
5. Si le client ne prend pas la marchandise, cliquez sur **Annuler** et confirmez. L'argent encaissé est retiré de la caisse : le comptoir rembourse le client. La marchandise reste au magasin.

> **Consigne absolue.** Ne remettez jamais de marchandise à un commercial sur une demande au statut **Créée / En attente**. Le bouton « Livrer » n'apparaît que sur les demandes expressément validées par la gestion (**Validée**). Une vente au comptant est déjà **Validée** : vous pouvez la livrer sans attendre une autre validation.

---

## 2. Traitement physique des retours d'articles (Menu Stock Commercial > Retours)

Lorsqu'un commercial restitue des articles au dépôt central (invendus de tournée, emballages détériorés, réajustement de dotation), l'opération est traitée dans **Stock Commercial > Retours**, sélecteur **Crédit**.

### A. Réceptionner un retour conforme
1. Le commercial présente les articles au magasin avec son numéro de déclaration de retour.
2. Ouvrez **Stock Commercial > Retours** et identifiez la ligne au statut **En attente**.
3. Vérifiez l'intégrité des produits restitués (état de marche, emballage intact, conformité des références).
4. Si les articles sont conformes, cliquez sur le bouton vert **« Réceptionner »**.
   * Le statut bascule à **Réceptionné**.
   * Le stock central du magasin est réapprovisionné et les articles sont remis en rayon.
   * Le commercial est déchargé de la marchandise.

### B. Refus d'un retour non conforme
* Si un article est détérioré par la faute du commercial ou incomplet, le magasinier ou le gestionnaire clique sur **« Refuser »**.
* Le retour passe au statut **Refusé** : le stock central n'est pas incrémenté et l'article reste sous la responsabilité comptable du commercial jusqu'à règlement du litige.

---

## 3. Sorties et retours tontine (sélecteur Tontine)

À l'approche des fêtes de fin d'année et de la clôture des cycles de cotisation, les commerciaux reçoivent des dotations d'articles destinés aux membres tontine. Ces mouvements se traitent dans le même menu, avec le sélecteur **Tontine**.

<!-- CAPTURE À INSÉRER : Demandes de sortie avec le sélecteur Tontine actif et le bouton Livrer. -->

### A. Délivrance
1. Ouvrez **Stock Commercial > Demandes Sortie**.
2. Cliquez sur **Tontine**.
3. Repérez la demande au statut **Validée**.
4. Cliquez sur **« Voir »** pour examiner les articles et les quantités. La référence s'affiche en haut. **« Télécharger »** enregistre la fiche de cette demande.
5. Rassemblez les colis et vérifiez les références avec le commercial au guichet.
6. Si la dotation ne doit pas partir, cliquez sur **« Annuler »** puis confirmez. La demande passe au statut **Annulée** et le stock tontine ne change pas.
7. Cliquez sur **« Livrer »**.
   * Le stock dépôt tontine est débité.
   * Le commercial est crédité de sa dotation tontine.
   * La demande passe au statut **Livrée**.

La remise au membre se fait ensuite dans le menu **Tontines**, sur la fiche du membre.

### B. Retour
1. Ouvrez **Stock Commercial > Retours** et cliquez sur **Tontine**.
2. Examinez la ligne au statut **En attente**.
3. Après inspection des emballages, cliquez sur **« Réceptionner »** pour déduire les articles de la dotation tontine du commercial et réintégrer automatiquement les quantités et le lot FIFO dans le stock du magasin central.

Le suivi des quantités annuelles se fait dans **Stock Commercial > Stock**, sélecteur **Tontine**.

---

## 4. Réservation à la validation, livraison partielle et reliquat automatique

1. **Réservation dès la validation** : Dès qu'une demande de sortie est **Validée**, les quantités sont réservées dans le magasin de l'agence (`Réservé` augmente, `Disponible` diminue). Si le stock physique est insuffisant au moment de la validation, l'écart est enregistré en réservation prioritaire et sera automatiquement alloué en FIFO dès la prochaine réception fournisseur ou le prochain transfert entrant.
2. **Livraison partielle et demande reliquat** : Lors de la remise physique au comptoir, si une partie seulement des quantités validées est disponible en magasin, la demande initiale passe au statut **Partiellement livrée** pour les quantités remises, et le système crée automatiquement une **demande reliquat enfant** déjà au statut **Validée** (liée à la demande parente) qui conserve la réservation active sur le reste à livrer.

---

## 5. Traçabilité & Liquidation des Lots (Menu Stock Commercial > Traçabilité des Lots)

L'écran **Traçabilité des Lots** (`/stock/lot-traceability`) permet de suivre le cycle de vie complet de chaque lot d'articles entré en magasin :
* **Restant en magasin** : unités du lot toujours présentes dans les rayons de l'agence.
* **Transféré inter-agences** : unités expédiées vers une autre agence (conservant la filiation avec le lot parent).
* **Doté aux commerciaux** : unités remises aux commerciaux, avec le détail nominatif par commercial (`Pris`, `Vendu / Livré client`, `Retourné`, `Restant en main`).
* **Statut de liquidation** : indique si le lot est **En cours d'écoulement** ou **100 % Liquidé** (plus aucune unité ni en magasin ni entre les mains des commerciaux).

---

## 6. Transferts Inter-Agences (Menu Stock Commercial > Transferts Inter-Agences)

Les utilisateurs habilités (**Responsable Magasinier**, **Gestionnaire**, **Administrateur**) peuvent équilibrer les stocks entre agences via un workflow sécurisé en 2 étapes (`/stock/transfers`) :
1. **Création & Expédition (Agence source)** : Créez le bon de transfert en sélectionnant l'agence source, l'agence destination et les articles/quantités, puis cliquez sur **« Expédier »**. Le stock physique de l'agence source est débité en FIFO et les lots transférés passent au statut **En transit**.
2. **Réception (Agence destination)** : À l'arrivée physique de la marchandise, le magasinier de l'agence destinataire clique sur **« Réceptionner »**. Les lots entrants sont créés dans l'agence de destination avec leur coût d'achat FIFO d'origine (et liés au lot parent), et toute réservation en attente dans l'agence de destination est immédiatement servie.


